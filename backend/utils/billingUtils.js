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
 * Calculate proration based on days
 * @param {number} dailyAmount - Amount per day in cents
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Prorated amount in cents
 */
export const calculateProration = (dailyAmount, startDate, endDate) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((endDate - startDate) / msPerDay);
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

export default {
  getNextFirstOfMonth,
  generateApiKey,
  formatCentsToAud,
  isValidRedirectUrl,
  calculateProration,
  mapSubscriptionStatus,
};
