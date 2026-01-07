/**
 * Admin JWT Authentication Middleware
 * 
 * Validates JWT token from Authorization header.
 * Attaches adminUser to request object.
 */

import { verifyToken, getCurrentUser } from '../services/auth.service.js';

const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🚀 ~ adminAuth ~ authHeader:', authHeader)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  console.log('🚀 ~ adminAuth ~ decoded:', decoded)

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  try {
    const user = await getCurrentUser(decoded.id);
    req.adminUser = user;
    next();
  } catch (_err) {
    return res.status(401).json({
      success: false,
      message: 'User not found',
    });
  }
};

/**
 * Role-based access control middleware
 * @param {string|string[]} allowedRoles - Role(s) allowed to access the route
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const roles = allowedRoles.flat();
    if (!roles.includes(req.adminUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

export default adminAuth;
