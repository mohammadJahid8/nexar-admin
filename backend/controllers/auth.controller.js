import * as AuthService from '../services/auth.service.js';
import sendResponse from '../utils/sendResponse.js';

/**
 * POST /api/auth/login
 * Login with email and password
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    sendResponse(res, { statusCode: 200, success: true, message: 'Login successful', data: result });
  } catch (err) {
    sendResponse(res, { statusCode: err.statusCode || 500, success: false, message: err.message });
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, { statusCode: 401, success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      return sendResponse(res, { statusCode: 401, success: false, message: 'Invalid or expired token' });
    }

    const user = await AuthService.getCurrentUser(decoded.id);
    sendResponse(res, { statusCode: 200, success: true, message: 'User retrieved', data: user });
  } catch (err) {
    sendResponse(res, { statusCode: err.statusCode || 500, success: false, message: err.message });
  }
};

/**
 * GET /api/admin/users
 * Get all admin users
 */
export const getUsers = async (req, res) => {
  try {
    const users = await AuthService.getAdminUsers();
    sendResponse(res, { statusCode: 200, success: true, message: 'Users retrieved', data: { users } });
  } catch (err) {
    sendResponse(res, { statusCode: err.statusCode || 500, success: false, message: err.message });
  }
};

/**
 * POST /api/admin/users
 * Create new admin user (super_admin only)
 */
export const createUser = async (req, res) => {
  try {
    const user = await AuthService.createAdminUser(req.body, req.adminUser.id);
    sendResponse(res, { statusCode: 201, success: true, message: 'User created successfully', data: { user } });
  } catch (err) {
    sendResponse(res, { statusCode: err.statusCode || 500, success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete admin user (super_admin only)
 */
export const deleteUser = async (req, res) => {
  try {
    await AuthService.deleteAdminUser(req.params.id, req.adminUser.id);
    sendResponse(res, { statusCode: 200, success: true, message: 'User deleted successfully' });
  } catch (err) {
    sendResponse(res, { statusCode: err.statusCode || 500, success: false, message: err.message });
  }
};
