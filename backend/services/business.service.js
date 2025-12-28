import httpStatus from 'http-status';
import { Business, InvoiceRecord, SeatEventLog, UserSeat } from '../models/index.js';

import { listInvoices } from './stripe.service.js';
import { generateApiKey, calculateEstimatedBill } from '../utils/billingUtils.js';

/**
 * Create a new business
 */
export const createBusiness = async (data) => {
  const { name, externalBusinessId, contactEmail, seatPriceAudCents } = data;

  // Validate required fields
  if (!name || !externalBusinessId || seatPriceAudCents === undefined) {
    const error = new Error('name, externalBusinessId, and seatPriceAudCents are required');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  // Validate seatPriceAudCents
  if (!Number.isInteger(seatPriceAudCents) || seatPriceAudCents < 0) {
    const error = new Error('seatPriceAudCents must be a non-negative integer');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  // Check if business already exists
  const existing = await Business.findByExternalId(externalBusinessId);
  if (existing) {
    const error = new Error('Business with this externalBusinessId already exists');
    error.statusCode = httpStatus.CONFLICT;
    throw error;
  }

  // Generate API key
  const apiKey = generateApiKey();

  // Create business
  const business = await Business.create({
    name,
    externalBusinessId: externalBusinessId.toLowerCase(),
    contactEmail,
    seatPriceAudCents,
    apiKey,
  });

  return { business: business.toJSON(), apiKey };
};

/**
 * List all businesses
 */
export const listBusinesses = async (query = {}) => {
  const { limit = 50, offset = 0, status } = query;

  const filter = {};
  if (status) {
    filter.billingStatus = status;
  }

  const [businesses, total] = await Promise.all([
    Business.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean(),
    Business.countDocuments(filter),
  ]);

  return {
    businesses,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + businesses.length < total,
    },
  };
};

/**
 * Get a single business by ID
 */
export const getBusinessById = async (id) => {
  const business = await Business.findById(id).lean();

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  return business;
};

/**
 * Update a business
 */
export const updateBusiness = async (id, data) => {
  const { name, contactEmail, seatPriceAudCents } = data;

  const business = await Business.findById(id);

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  // Update allowed fields
  if (name !== undefined) business.name = name;
  if (contactEmail !== undefined) business.contactEmail = contactEmail;
  if (seatPriceAudCents !== undefined) {
    if (!Number.isInteger(seatPriceAudCents) || seatPriceAudCents < 0) {
      const error = new Error('seatPriceAudCents must be a non-negative integer');
      error.statusCode = httpStatus.BAD_REQUEST;
      throw error;
    }
    business.seatPriceAudCents = seatPriceAudCents;
  }

  await business.save();
  return business.toJSON();
};

/**
 * Reset business API key
 */
export const resetBusinessApiKey = async (id) => {
  const business = await Business.findById(id);

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  const newApiKey = generateApiKey();
  business.apiKey = newApiKey;
  await business.save();

  return { business: business.toJSON(), apiKey: newApiKey };
};

/**
 * Get business billing summary with estimated bill calculation
 */
export const getBusinessBilling = async (id) => {
  const business = await Business.findById(id).lean();

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  // Get latest invoices from local DB
  const invoices = await InvoiceRecord.find({ businessId: id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Get seat change history
  const seatHistory = await SeatEventLog.find({ businessId: id })
    .sort({ at: -1 })
    .limit(20)
    .lean();

  // If there's a Stripe customer, try to fetch latest invoices from Stripe
  let stripeInvoices = [];
  if (business.stripeCustomerId) {
    try {
      const result = await listInvoices(business.stripeCustomerId, 5);
      stripeInvoices = result.data.map((inv) => ({
        id: inv.id,
        status: inv.status,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        created: new Date(inv.created * 1000),
      }));
    } catch (stripeError) {
      console.error('Failed to fetch Stripe invoices:', stripeError);
    }
  }

  // Calculate estimated bill using shared utility (async for per-user support)
  const estimatedBill = await calculateEstimatedBill(business, UserSeat);

  return {
    billing: {
      status: business.billingStatus,
      stripeCustomerId: business.stripeCustomerId,
      stripeSubscriptionId: business.stripeSubscriptionId,
      stripeSubscriptionItemId: business.stripeSubscriptionItemId,
      currentSeatCount: business.currentSeatCount,
      cumulativeSeatDays: business.cumulativeSeatDays || 0,
      seatPriceAudCents: business.seatPriceAudCents,
      currentPeriodStart: business.currentPeriodStart,
      currentPeriodEnd: business.currentPeriodEnd,
      billingEnabledAt: business.billingEnabledAt,
      lastUsageSyncAt: business.lastUsageSyncAt,
    },
    estimatedBill,
    invoices,
    stripeInvoices,
    seatHistory,
  };
};

/**
 * Get dashboard stats including monthly paid revenue
 */
export const getDashboardStats = async () => {
  const businesses = await Business.find().lean();

  // Calculate stats
  const activeBusinesses = businesses.filter(b => b.billingStatus === 'active');

  // Get this month's date range
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfMonthTimestamp = Math.floor(startOfMonth.getTime() / 1000);

  // Fetch paid invoices from all active customers
  let monthlyPaidRevenue = 0;

  for (const business of activeBusinesses) {
    if (business.stripeCustomerId) {
      try {
        const invoices = await listInvoices(business.stripeCustomerId, 10);
        for (const inv of invoices.data) {
          if (inv.status === 'paid' && inv.created >= startOfMonthTimestamp) {
            monthlyPaidRevenue += inv.amount_paid;
          }
        }
      } catch (err) {
        console.error('Failed to fetch invoices for', business.externalBusinessId, err);
      }
    }
  }

  // Calculate billing stats using shared utility for consistency
  let currentBilledCents = 0;
  let projectedBillCents = 0;

  for (const b of activeBusinesses) {
    const estimatedBill = await calculateEstimatedBill(b, UserSeat);
    if (estimatedBill) {
      currentBilledCents += estimatedBill.currentTotalCents;
      projectedBillCents += estimatedBill.projectedTotalCents;
    }
  }

  return {
    totalBusinesses: businesses.length,
    activeSubscriptions: activeBusinesses.length,
    pendingCheckouts: businesses.filter(b => b.billingStatus === 'pending_checkout').length,
    pastDue: businesses.filter(b => b.billingStatus === 'past_due').length,
    totalSeats: businesses.reduce((sum, b) => sum + (b.currentSeatCount || 0), 0),
    currentBilledCents,
    projectedBillCents,
    monthlyPaidRevenueCents: monthlyPaidRevenue
  };
};

/**
 * Delete a business
 * Note: Will not delete if business has active subscription
 */
export const deleteBusiness = async (id) => {
  const business = await Business.findById(id);

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  // Prevent deletion of businesses with active subscriptions
  if (business.billingStatus === 'active' || business.billingStatus === 'past_due') {
    const error = new Error('Cannot delete business with active or past due subscription. Please cancel the subscription first.');
    error.statusCode = httpStatus.CONFLICT;
    throw error;
  }

  // Delete related records
  await SeatEventLog.deleteMany({ businessId: id });
  await InvoiceRecord.deleteMany({ businessId: id });

  // Delete the business
  await Business.findByIdAndDelete(id);

  return { deleted: true, businessId: id };
};

export const BusinessService = {
  createBusiness,
  listBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  resetBusinessApiKey,
  getBusinessBilling,
  getDashboardStats
};

