/**
 * Admin API Key Authentication Middleware
 *
 * Validates the X-Admin-Api-Key header against the ADMIN_API_KEY environment variable.
 * Use this middleware to protect admin-only routes.
 */

const adminAuth = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-Admin-Api-Key header',
    });
  }

  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.error('ADMIN_API_KEY environment variable is not set');
    return res.status(500).json({
      error: 'Server Configuration Error',
      message: 'Admin authentication is not properly configured',
    });
  }

  if (apiKey !== expectedKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid admin API key',
    });
  }

  next();
};

export default adminAuth;
