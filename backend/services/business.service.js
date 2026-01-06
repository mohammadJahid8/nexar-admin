import httpStatus from 'http-status';
import { Business, InvoiceRecord, SeatEventLog, UserSeat } from '../models/index.js';

import { cancelSubscription, listInvoices, stripe, getUpcomingInvoice, updateSubscriptionPrice } from './stripe.service.js';
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
    domain: data.domain,
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
  const { name, contactEmail, seatPriceAudCents, domain } = data;

  const business = await Business.findById(id);

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  // Update allowed fields
  if (name !== undefined) business.name = name;
  if (contactEmail !== undefined) business.contactEmail = contactEmail;

  // Handle price update - also update Stripe if subscription is active
  if (seatPriceAudCents !== undefined && seatPriceAudCents !== business.seatPriceAudCents) {
    if (!Number.isInteger(seatPriceAudCents) || seatPriceAudCents < 0) {
      const error = new Error('seatPriceAudCents must be a non-negative integer');
      error.statusCode = httpStatus.BAD_REQUEST;
      throw error;
    }

    // If billing is active, update Stripe subscription with new price
    if (business.billingStatus === 'active' && business.stripeSubscriptionId && business.stripeSubscriptionItemId) {

      try {
        await updateSubscriptionPrice(
          business.stripeSubscriptionId,
          business.stripeSubscriptionItemId,
          business._id.toString(),
          seatPriceAudCents
        );
        console.log(`Updated Stripe price for business ${id} to ${seatPriceAudCents} cents`);
      } catch (stripeErr) {
        console.error('Failed to update Stripe price:', stripeErr.message);
        const error = new Error('Failed to update Stripe subscription price: ' + stripeErr.message);
        error.statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        throw error;
      }
    }

    business.seatPriceAudCents = seatPriceAudCents;
  }

  if (domain !== undefined) business.domain = domain;

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
  let upcomingInvoiceAmount = null;
  if (business.stripeCustomerId) {
    try {
      const result = await listInvoices(business.stripeCustomerId, 5);
      // Filter out draft invoices - only show actual invoices (paid, open, uncollectible)
      stripeInvoices = result.data
        .map((inv) => ({
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

    // Fetch upcoming invoice to get ACTUAL current billed amount from Stripe
    // This reflects usage at the correct price points (even after price changes)
    try {

      const upcomingInvoice = await getUpcomingInvoice(business.stripeCustomerId);
      if (upcomingInvoice) {
        upcomingInvoiceAmount = upcomingInvoice.amount_due;
      }
    } catch (upcomingErr) {
      console.error('Failed to fetch upcoming invoice:', upcomingErr.message);
    }
  }

  // Calculate estimated bill using shared utility (async for per-user support)
  const estimatedBill = await calculateEstimatedBill(business, UserSeat);

  // Override currentTotalCents with Stripe's actual amount if available
  if (estimatedBill && upcomingInvoiceAmount !== null) {
    estimatedBill.currentTotalCents = upcomingInvoiceAmount;
    estimatedBill.currentTotalAud = (upcomingInvoiceAmount / 100).toFixed(2);
  }

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
  let totalRevenue = 0;

  for (const business of activeBusinesses) {
    if (business.stripeCustomerId) {
      try {
        const invoices = await listInvoices(business.stripeCustomerId, 100);
        for (const inv of invoices.data) {
          if (inv.status === 'paid') {
            totalRevenue += inv.amount_paid; // All-time
            if (inv.created >= startOfMonthTimestamp) {
              monthlyPaidRevenue += inv.amount_paid; // This month
            }
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
    monthlyPaidRevenueCents: monthlyPaidRevenue,
    totalRevenueCents: totalRevenue
  };
};

/**
 * Delete a business
 * Automatically cancels Stripe subscription and deletes products/prices, then deletes all data
 */
export const deleteBusiness = async (id) => {
  const business = await Business.findById(id);

  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  // Cancel Stripe subscription if it exists
  if (business.stripeSubscriptionId) {
    try {
      await cancelSubscription(business.stripeSubscriptionId);
      console.log(`Canceled Stripe subscription: ${business.stripeSubscriptionId}`);
    } catch (stripeErr) {
      console.error('Failed to cancel Stripe subscription:', stripeErr.message);
    }
  }

  // Delete Stripe products and prices for this business
  if (business._id) {
    try {


      // Search for products with this business ID
      const products = await stripe.instance.products.search({
        query: `metadata['nexer_business_id']:'${business._id.toString()}'`
      });

      // Archive each product (which also archives all associated prices)
      for (const product of products.data) {
        try {
          await stripe.instance.products.update(product.id, { active: false });
          console.log(`Archived Stripe product: ${product.id}`);
        } catch (productErr) {
          console.error(`Failed to archive product ${product.id}:`, productErr.message);
        }
      }
    } catch (stripeErr) {
      console.error('Failed to clean up Stripe products:', stripeErr.message);
    }
  }

  // Delete related records
  await UserSeat.deleteMany({ businessId: id });
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

