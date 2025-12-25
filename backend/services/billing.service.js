import httpStatus from 'http-status';
import { Business, SeatEventLog, UserSeat } from '../models/index.js';
import {
  createCustomer,
  createSetupCheckout,
  createMeteredSubscription,
  reportSeatDays,
  listInvoices,
  createBillingPortal
} from './stripe.service.js';
import { calculateEstimatedBill } from '../utils/billingUtils.js';

/**
 * Create Setup Checkout
 */
export const createCheckoutSession = async (business, data) => {
  const { successUrl, cancelUrl, initialUserIds } = data;

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
    cancelUrl,
    initialUserIds
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
 * Sync seats with per-user tracking
 * Requires activeUserIds array for accurate per-user billing.
 * 
 * Uses MongoDB transaction to prevent race conditions from concurrent requests
 */
export const syncSeats = async (business, data) => {
  const { activeUserIds, reason } = data;

  // Validate input - only activeUserIds is supported
  if (!Array.isArray(activeUserIds) || activeUserIds.length < 1) {
    const error = new Error('activeUserIds array is required and must contain at least 1 user');
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
      const previousCount = freshBusiness.currentSeatCount;

      // Sync user seats (add new, deactivate removed)
      const syncResult = await UserSeat.syncWithUserIds(
        freshBusiness._id,
        activeUserIds,
        reason
      );

      // Calculate per-user seat-days since last billing
      const seatDaysToReport = await UserSeat.calculateSeatDays(freshBusiness._id, now);

      let seatDaysReported = 0;
      if (seatDaysToReport > 0) {
        // Report to Stripe
        await reportSeatDays(freshBusiness.stripeSubscriptionItemId, seatDaysToReport);
        console.log(`Reported ${seatDaysToReport} seat-days`);

        // Mark all active seats as billed up to now
        await UserSeat.markDaysBilled(freshBusiness._id, now);

        // Update business cumulative
        freshBusiness.cumulativeSeatDays = (freshBusiness.cumulativeSeatDays || 0) + seatDaysToReport;
        freshBusiness.lastUsageSyncAt = now;
        seatDaysReported = seatDaysToReport;
      }

      // Update seat count
      freshBusiness.currentSeatCount = activeUserIds.length;
      await freshBusiness.save({ session });

      // Log seat changes
      if (syncResult.added.length > 0 || syncResult.removed.length > 0) {
        await SeatEventLog.logChange(
          freshBusiness._id,
          previousCount,
          activeUserIds.length,
          reason || `Added: ${syncResult.added.length}, Removed: ${syncResult.removed.length}`,
          'crm-sync'
        );
      }

      result = {
        currentSeatCount: activeUserIds.length,
        previousSeatCount: previousCount,
        seatDaysReported,
        cumulativeSeatDays: freshBusiness.cumulativeSeatDays || 0,
        usersAdded: syncResult.added,
        usersRemoved: syncResult.removed,
        usersReactivated: syncResult.reactivated,
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
 * Uses the shared calculateEstimatedBillAsync utility for per-user accuracy
 */
export const getEstimatedBill = async (business) => {
  const freshBusiness = await Business.findById(business._id).lean();

  const estimatedBill = await calculateEstimatedBill(freshBusiness, UserSeat);

  if (!estimatedBill) {
    return {
      totalAmountCents: 0,
      totalAmountAud: '0.00',
      message: 'Billing not active'
    };
  }

  return estimatedBill;
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
