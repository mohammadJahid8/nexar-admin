/**
 * Calculate full days (24-hour periods) between two dates.
 * Uses UTC to avoid DST edge cases.
 * Only counts complete 24-hour periods (>= 24hrs = 1 day).
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of complete days (always >= 0)
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate difference in milliseconds
  const diffMs = end.getTime() - start.getTime();

  // Convert to days and floor (only complete 24-hour periods count)
  const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}
