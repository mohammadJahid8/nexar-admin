import httpStatus from 'http-status';
import { Business, SeatEventLog } from '../models/index.js';
import {
  createCustomer,
  createSetupCheckout,
  createMeteredSubscription,
  reportSeatDays,
  listInvoices,
  createBillingPortal
} from './stripeService.js';
import { daysBetween } from '../utils/daysBetween.js';

/**
 * Create Setup Checkout
 */
export const createCheckoutSession = async (business, data) => {
  const { successUrl, cancelUrl } = data;

  if (!successUrl || !cancelUrl) {
    const error = new Error('successUrl and cancelUrl are required');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  if (business.billingStatus === 'active') {
    const error = new Error('Billing is already active');
    error.statusCode = httpStatus.CONFLICT;
    throw error;
  }

  const freshBusiness = await Business.findById(business._id);

  if (!freshBusiness.stripeCustomerId) {
    const customer = await createCustomer(freshBusiness);
    freshBusiness.stripeCustomerId = customer.id;
    await freshBusiness.save();
  }

  const session = await createSetupCheckout({
    business: freshBusiness,
    successUrl,
    cancelUrl
  });

  freshBusiness.billingStatus = 'pending_checkout';
  await freshBusiness.save();

  return { url: session.url, sessionId: session.id };
};

/**
 * Activate billing (called by webhook)
 */
export const activateBilling = async (businessId) => {
  const business = await Business.findById(businessId);
  if (!business) return null;

  const subscription = await createMeteredSubscription({
    customerId: business.stripeCustomerId,
    businessId: business._id.toString(),
    externalBusinessId: business.externalBusinessId,
    seatPriceAudCents: business.seatPriceAudCents
  });

  const subscriptionItem = subscription.items.data[0];

  business.billingStatus = 'active';
  business.stripeSubscriptionId = subscription.id;
  business.stripeSubscriptionItemId = subscriptionItem.id;
  business.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  business.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  business.billingEnabledAt = new Date();
  business.lastUsageSyncAt = new Date();
  business.cumulativeSeatDays = 0;

  await business.save();

  // No initial seat-day report - first sync will report Day 1's usage
  // This prevents double-counting activation day

  console.log('Billing activated for', business.externalBusinessId);
  return business;
};

/**
 * Sync seats with daily proration
 * Uses MongoDB transaction to prevent race conditions from concurrent requests
 */
export const syncSeats = async (business, data) => {
  const { activeSeatCount, reason } = data;

  if (!Number.isInteger(activeSeatCount) || activeSeatCount < 1) {
    const error = new Error('activeSeatCount must be an integer >= 1');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  if (business.billingStatus !== 'active') {
    const error = new Error('Billing is not active');
    error.statusCode = httpStatus.CONFLICT;
    throw error;
  }

  // Use a session for transaction support
  const session = await Business.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // Fetch fresh data within transaction
      const freshBusiness = await Business.findById(business._id).session(session);

      if (!freshBusiness) {
        const error = new Error('Business not found');
        error.statusCode = httpStatus.NOT_FOUND;
        throw error;
      }

      if (!freshBusiness.stripeSubscriptionItemId) {
        const error = new Error('No active subscription');
        error.statusCode = httpStatus.CONFLICT;
        throw error;
      }

      const now = new Date();
      const lastSync = freshBusiness.lastUsageSyncAt || freshBusiness.billingEnabledAt || now;
      const previousCount = freshBusiness.currentSeatCount;
      const daysElapsed = daysBetween(lastSync, now);

      let seatDaysReported = 0;

      // Report seat-days to Stripe (outside transaction but before DB update)
      if (daysElapsed > 0 && previousCount > 0) {
        seatDaysReported = previousCount * daysElapsed;

        // Report to Stripe first - if this fails, we don't update DB
        await reportSeatDays(freshBusiness.stripeSubscriptionItemId, seatDaysReported);
        console.log(`Reported ${seatDaysReported} seat-days (${previousCount} seats × ${daysElapsed} days)`);

        // Only update cumulative after successful Stripe reporting
        freshBusiness.cumulativeSeatDays = (freshBusiness.cumulativeSeatDays || 0) + seatDaysReported;
      }

      // Update seat count and sync timestamp
      freshBusiness.currentSeatCount = activeSeatCount;
      freshBusiness.lastUsageSyncAt = now;
      await freshBusiness.save({ session });

      // Log seat change if it changed
      if (previousCount !== activeSeatCount) {
        await SeatEventLog.logChange(freshBusiness._id, previousCount, activeSeatCount, reason, 'crm-sync');
      }

      result = {
        currentSeatCount: activeSeatCount,
        previousSeatCount: previousCount,
        seatDaysReported,
        cumulativeSeatDays: freshBusiness.cumulativeSeatDays || 0
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Get billing status
 */
export const getBillingStatus = async (business) => {
  const freshBusiness = await Business.findById(business._id).lean();
  return {
    billingStatus: freshBusiness.billingStatus,
    currentSeatCount: freshBusiness.currentSeatCount,
    seatPriceAudCents: freshBusiness.seatPriceAudCents,
    currentPeriodStart: freshBusiness.currentPeriodStart,
    currentPeriodEnd: freshBusiness.currentPeriodEnd,
    cumulativeSeatDays: freshBusiness.cumulativeSeatDays || 0
  };
};

/**
 * Get ACCURATE estimated bill for current period
 * Includes already-reported usage + unreported days at current rate
 */
export const getEstimatedBill = async (business) => {
  const freshBusiness = await Business.findById(business._id).lean();

  if (freshBusiness.billingStatus !== 'active') {
    return {
      totalAmountCents: 0,
      totalAmountAud: '0.00',
      message: 'Billing not active'
    };
  }

  const now = new Date();
  const periodStart = new Date(freshBusiness.currentPeriodStart || freshBusiness.billingEnabledAt);
  const periodEnd = new Date(freshBusiness.currentPeriodEnd);
  const lastSync = new Date(freshBusiness.lastUsageSyncAt || periodStart);

  const totalDaysInPeriod = daysBetween(periodStart, periodEnd);
  const daysRemaining = Math.max(0, daysBetween(now, periodEnd));
  const daysSinceLastSync = daysBetween(lastSync, now);

  const dailyRate = Math.round(freshBusiness.seatPriceAudCents / 30);
  const seats = freshBusiness.currentSeatCount;

  // Already reported seat-days
  const reportedSeatDays = freshBusiness.cumulativeSeatDays || 0;
  const reportedAmountCents = reportedSeatDays * dailyRate;

  // Unreported seat-days (since last sync)
  const unreportedSeatDays = seats * daysSinceLastSync;
  const unreportedAmountCents = unreportedSeatDays * dailyRate;

  // Current total (what you owe NOW)
  const currentTotalSeatDays = reportedSeatDays + unreportedSeatDays;
  const currentTotalCents = currentTotalSeatDays * dailyRate;

  // Projected total (if seats stay same until period end)
  const projectedRemainingSeatDays = seats * daysRemaining;
  const projectedTotalSeatDays = currentTotalSeatDays + projectedRemainingSeatDays;
  const projectedTotalCents = projectedTotalSeatDays * dailyRate;

  return {
    // Current state
    currentSeatCount: seats,
    dailyRateCents: dailyRate,
    dailyRateAud: (dailyRate / 100).toFixed(2),

    // Period info
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalDaysInPeriod,
    daysRemaining,

    // Usage breakdown
    reportedSeatDays,
    reportedAmountCents,
    reportedAmountAud: (reportedAmountCents / 100).toFixed(2),

    unreportedSeatDays,
    unreportedAmountCents,
    unreportedAmountAud: (unreportedAmountCents / 100).toFixed(2),

    // Current bill (what you owe now)
    currentTotalSeatDays,
    currentTotalCents,
    currentTotalAud: (currentTotalCents / 100).toFixed(2),

    // Projected bill (if seats stay same)
    projectedTotalSeatDays,
    projectedTotalCents,
    projectedTotalAud: (projectedTotalCents / 100).toFixed(2)
  };
};

/**
 * Get invoices
 */
export const getInvoices = async (business, limit = 20) => {
  if (!business.stripeCustomerId) return { invoices: [] };

  const result = await listInvoices(business.stripeCustomerId, parseInt(limit));

  const invoices = result.data.map(inv => ({
    id: inv.id,
    status: inv.status,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    invoicePdf: inv.invoice_pdf,
    created: new Date(inv.created * 1000)
  }));

  return { invoices };
};

/**
 * Get portal URL
 */
export const getPortalUrl = async (business, returnUrl) => {
  if (!business.stripeCustomerId) {
    const error = new Error('No billing account');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  const session = await createBillingPortal(business.stripeCustomerId, returnUrl);
  return { url: session.url };
};

export const BillingService = {
  createCheckoutSession,
  activateBilling,
  syncSeats,
  getBillingStatus,
  getEstimatedBill,
  getInvoices,
  getPortalUrl
};
