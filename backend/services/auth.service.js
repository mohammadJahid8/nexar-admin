import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import { AdminUser } from '../models/index.js';



/**
 * Generate JWT token for admin user
 */
const generateToken = (userId) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token and return payload
 */
export const verifyToken = (token) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_err) {
    return null;
  }
};

/**
 * Login with email and password
 */
export const login = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  // Find user with password included
  const user = await AdminUser.findOne({ email }).select('+password');

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = httpStatus.UNAUTHORIZED;
    throw error;
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = httpStatus.UNAUTHORIZED;
    throw error;
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
};

/**
 * Get current user by ID
 */
export const getCurrentUser = async (userId) => {
  const user = await AdminUser.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
};

/**
 * Get all admin users
 */
export const getAdminUsers = async () => {
  const users = await AdminUser.find().sort({ createdAt: -1 });

  return users.map(user => ({
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }));
};

/**
 * Create new admin user (super_admin only)
 */
export const createAdminUser = async (data, createdByUserId) => {
  const { email, password, firstName, lastName, role } = data;

  // Check if email already exists
  const existing = await AdminUser.findOne({ email });
  if (existing) {
    const error = new Error('Email already in use');
    error.statusCode = httpStatus.CONFLICT;
    throw error;
  }

  const user = await AdminUser.create({
    email,
    password,
    firstName,
    lastName,
    role: role || 'admin',
    createdBy: createdByUserId,
  });

  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
  };
};

/**
 * Delete admin user (super_admin only)
 */
export const deleteAdminUser = async (userId, requestingUserId) => {
  if (userId === requestingUserId.toString()) {
    const error = new Error('Cannot delete yourself');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  const user = await AdminUser.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  await AdminUser.findByIdAndDelete(userId);

  return { message: 'User deleted successfully' };
};

export default {
  login,
  verifyToken,
  getCurrentUser,
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
};
