import { Business } from '../models/index.js';

/**
 * CRM Business API Authentication Middleware
 *
 * Validates per-business authentication using:
 * - X-Business-Id: The external business ID
 * - X-Api-Key: The business-specific API key
 *
 * On success, attaches the business document to req.business
 */

const crmAuth = async (req, res, next) => {
  const businessId = req.headers['x-business-id'];
  console.log('🚀 ~ crmAuth ~ businessId:', businessId)
  const apiKey = req.headers['x-api-key'];

  if (!businessId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-Business-Id header',
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-Api-Key header',
    });
  }

  try {
    // Find business with API key included
    const business = await Business.findByExternalIdWithApiKey(businessId);

    if (!business) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Business not found',
      });
    }

    // Validate API key
    if (business.apiKey !== apiKey) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid API key',
      });
    }

    // Attach business to request (without apiKey in the object)
    req.business = business.toObject();
    delete req.business.apiKey;

    next();
  } catch (error) {
    console.error('CRM Auth Error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Authentication failed due to server error',
    });
  }
};

export default crmAuth;
