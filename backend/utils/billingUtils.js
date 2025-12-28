import crypto from 'crypto';

/**
 * Calculate the next 1st of the month as a Unix timestamp
 * Used for setting billing_cycle_anchor in Stripe subscriptions
 *
 * @param {Date} [fromDate=new Date()] - Date to calculate from
 * @returns {number} Unix timestamp of the next 1st of the month at 00:00:00 UTC
 */
export const getNextFirstOfMonth = (fromDate = new Date()) => {
  const date = new Date(fromDate);

  // Get the current year and month
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth();

  // Move to next month
  month += 1;

  // Handle year rollover
  if (month > 11) {
    month = 0;
    year += 1;
  }

  // Create date for 1st of next month at 00:00:00 UTC
  const nextFirst = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  // Return Unix timestamp (seconds)
  return Math.floor(nextFirst.getTime() / 1000);
};

/**
 * Generate a secure random API key
 * Format: nxr_live_xxxxxxxxxxxxxxxxxxxx (32 chars of random hex)
 *
 * @param {string} [prefix='nxr_live_'] - Prefix for the API key
 * @returns {string} Generated API key
 */
export const generateApiKey = (prefix = 'nxr_live_') => {
  const randomBytes = crypto.randomBytes(24);
  const randomHex = randomBytes.toString('hex');
  return `${prefix}${randomHex}`;
};

/**
 * Format cents to AUD string
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted amount (e.g., "50.00")
 */
export const formatCentsToAud = (cents) => {
  return (cents / 100).toFixed(2);
};

/**
 * Validate a URL is HTTPS (for production) or HTTP/HTTPS (for development)
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export const isValidRedirectUrl = (url) => {
  try {
    const parsed = new URL(url);

    // In development, allow http://localhost
    if (process.env.NODE_ENV === 'development') {
      return ['http:', 'https:'].includes(parsed.protocol);
    }

    // In production, require HTTPS
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Calculate proration based on COMPLETE days
 * @param {number} dailyAmount - Amount per day in cents
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Prorated amount in cents
 */
export const calculateProration = (dailyAmount, startDate, endDate) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((endDate - startDate) / msPerDay);
  return Math.round(dailyAmount * days);
};

/**
 * Map Stripe subscription status to billing status
 * @param {string} stripeStatus - Stripe subscription status
 * @returns {string} Nexer billing status
 */
export const mapSubscriptionStatus = (stripeStatus) => {
  const statusMap = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'canceled',
    incomplete: 'pending_checkout',
    incomplete_expired: 'canceled',
    trialing: 'active',
    paused: 'past_due',
  };

  return statusMap[stripeStatus] || 'not_enabled';
};

/**
 * Calculate estimated bill for a business using per-user billing
 * Uses COMPLETE 24-hour periods from each user's activation time
 * 
 * @param {Object} business - Business document (lean object)
 * @param {Object} UserSeatModel - UserSeat mongoose model (required)
 * @returns {Object|null} Estimated bill breakdown, or null if billing not active
 */
export const calculateEstimatedBill = async (business, UserSeatModel) => {
  if (business.billingStatus !== 'active') {
    return null;
  }

  if (!UserSeatModel) {
    throw new Error('UserSeatModel is required for billing calculation');
  }

  const now = new Date();
  const periodStart = new Date(business.currentPeriodStart || business.billingEnabledAt);
  const periodEnd = new Date(business.currentPeriodEnd);
  const dailyRate = Math.round(business.seatPriceAudCents / 30);
  const msPerDay = 24 * 60 * 60 * 1000;

  // Get active seats for per-user billing
  const activeSeats = await UserSeatModel.getActiveSeats(business._id);

  let currentUnbilledDays = 0;
  let projectedTotalDays = 0;
  const perUserBreakdown = [];

  for (const seat of activeSeats) {
    // Calculate complete 24-hour days from activation
    const totalDaysSinceActivation = Math.floor((now - new Date(seat.activatedAt)) / msPerDay);
    const alreadyBilled = seat.cumulativeDays || 0;
    const unbilledDays = Math.max(0, totalDaysSinceActivation - alreadyBilled);

    currentUnbilledDays += unbilledDays;

    // Calculate projected days until period end (from activation)
    const daysUntilEndFromActivation = Math.floor((periodEnd - new Date(seat.activatedAt)) / msPerDay);
    projectedTotalDays += Math.max(0, daysUntilEndFromActivation);

    perUserBreakdown.push({
      externalUserId: seat.externalUserId,
      activatedAt: seat.activatedAt,
      cumulativeDays: alreadyBilled,
      unbilledDays,
      projectedTotalDays: Math.max(0, daysUntilEndFromActivation),
    });
  }

  const reportedSeatDays = business.cumulativeSeatDays || 0;
  const reportedAmountCents = reportedSeatDays * dailyRate;

  const currentTotalSeatDays = reportedSeatDays + currentUnbilledDays;
  const currentTotalCents = currentTotalSeatDays * dailyRate;
  const projectedTotalCents = projectedTotalDays * dailyRate;

  return {
    currentSeatCount: activeSeats.length,
    dailyRateCents: dailyRate,
    dailyRateAud: (dailyRate / 100).toFixed(2),

    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalDaysInPeriod: Math.floor((periodEnd - periodStart) / msPerDay),
    daysRemaining: Math.max(0, Math.floor((periodEnd - now) / msPerDay)),

    reportedSeatDays,
    reportedAmountCents,
    reportedAmountAud: (reportedAmountCents / 100).toFixed(2),

    unreportedSeatDays: currentUnbilledDays,
    unreportedAmountCents: currentUnbilledDays * dailyRate,
    unreportedAmountAud: ((currentUnbilledDays * dailyRate) / 100).toFixed(2),

    currentTotalSeatDays,
    currentTotalCents,
    currentTotalAud: (currentTotalCents / 100).toFixed(2),

    projectedTotalSeatDays: projectedTotalDays,
    projectedTotalCents,
    projectedTotalAud: (projectedTotalCents / 100).toFixed(2),

    perUserBreakdown,
  };
};

export default {
  getNextFirstOfMonth,
  generateApiKey,
  formatCentsToAud,
  isValidRedirectUrl,
  calculateProration,
  mapSubscriptionStatus,
  calculateEstimatedBill,
};
