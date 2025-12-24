/**
 * Simple In-Memory Rate Limiter
 *
 * Limits requests per business to prevent abuse.
 * Uses a sliding window approach with configurable window and max requests.
 *
 * Note: This is in-memory only. For production with multiple instances,
 * consider using Redis-based rate limiting.
 */

// Store: { businessId: { requests: [], windowStart: timestamp } }
const requestStore = new Map();

// Default config: 100 requests per minute per business
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;

/**
 * Creates a rate limiter middleware
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 */
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests || DEFAULT_MAX_REQUESTS;

  return (req, res, next) => {
    // Get business ID from request (set by crmAuth middleware)
    const businessId = req.business?._id?.toString() || req.headers['X-Business-Id'] || 'anonymous';
    const now = Date.now();

    // Get or initialize store for this business
    let storeEntry = requestStore.get(businessId);

    if (!storeEntry || now - storeEntry.windowStart >= windowMs) {
      // New window
      storeEntry = {
        requests: [],
        windowStart: now,
      };
      requestStore.set(businessId, storeEntry);
    }

    // Clean old requests outside the window
    storeEntry.requests = storeEntry.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    // Check if over limit
    if (storeEntry.requests.length >= maxRequests) {
      const retryAfter = Math.ceil((storeEntry.windowStart + windowMs - now) / 1000);

      res.set('Retry-After', retryAfter);
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', new Date(storeEntry.windowStart + windowMs).toISOString());

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    // Record this request
    storeEntry.requests.push(now);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - storeEntry.requests.length);
    res.set('X-RateLimit-Reset', new Date(storeEntry.windowStart + windowMs).toISOString());

    next();
  };
};

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [businessId, entry] of requestStore.entries()) {
    if (now - entry.windowStart > maxAge) {
      requestStore.delete(businessId);
    }
  }
}, 5 * 60 * 1000);

// Default rate limiter for CRM endpoints
const rateLimiter = createRateLimiter();

export { createRateLimiter };
export default rateLimiter;
