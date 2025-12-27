import { BusinessService } from '../services/business.service.js';

import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import { runDailyBilling } from '../jobs/dailyBillingJob.js';


/**
 * Create a new business
 */
const createBusiness = catchAsync(async (req, res) => {
  const result = await BusinessService.createBusiness(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Business created successfully',
    data: result,
  });
});

/**
 * List all businesses
 */
const listBusinesses = catchAsync(async (req, res) => {
  const result = await BusinessService.listBusinesses(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Businesses fetched successfully',
    data: result,
  });
});

/**
 * Get a single business
 */
const getBusiness = catchAsync(async (req, res) => {
  const result = await BusinessService.getBusinessById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business fetched successfully',
    data: { business: result },
  });
});

/**
 * Update a business
 */
const updateBusiness = catchAsync(async (req, res) => {
  const result = await BusinessService.updateBusiness(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business updated successfully',
    data: { business: result },
  });
});

/**
 * Reset business API key
 */
const resetApiKey = catchAsync(async (req, res) => {
  const result = await BusinessService.resetBusinessApiKey(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'API key reset successfully',
    data: result,
  });
});

/**
 * Get business billing summary
 */
const getBusinessBilling = catchAsync(async (req, res) => {
  const result = await BusinessService.getBusinessBilling(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Billing summary fetched successfully',
    data: result,
  });
});

/**
 * Get dashboard stats
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const result = await BusinessService.getDashboardStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard stats fetched successfully',
    data: result,
  });
});

/**
 * Trigger daily billing manually (for testing)
 */
const triggerDailyBilling = catchAsync(async (req, res) => {

  const result = await runDailyBilling();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Daily billing run completed',
    data: result,
  });
});

/**
 * Delete a business
 */
const deleteBusiness = catchAsync(async (req, res) => {
  const result = await BusinessService.deleteBusiness(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business deleted successfully',
    data: result,
  });
});

export const AdminController = {
  createBusiness,
  listBusinesses,
  getBusiness,
  updateBusiness,
  deleteBusiness,
  resetApiKey,
  getBusinessBilling,
  getDashboardStats,
  triggerDailyBilling,
};
