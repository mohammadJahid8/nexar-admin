import { BillingService } from '../services/billing.service.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import httpStatus from 'http-status';

/**
 * Create Checkout Session (setup mode - just collect payment method)
 */
const createCheckoutSession = catchAsync(async (req, res) => {
  const result = await BillingService.createCheckoutSession(req.business, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created',
    data: result
  });
});

/**
 * Sync seat count
 */
const syncSeats = catchAsync(async (req, res) => {
  const result = await BillingService.syncSeats(req.business, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Seats synced',
    data: result
  });
});

/**
 * Get billing status
 */
const getBillingStatus = catchAsync(async (req, res) => {
  const result = await BillingService.getBillingStatus(req.business);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Billing status fetched',
    data: result
  });
});

/**
 * Get invoices
 */
const getInvoices = catchAsync(async (req, res) => {
  const result = await BillingService.getInvoices(req.business, req.query.limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Invoices fetched',
    data: result
  });
});

/**
 * Get billing portal URL
 */
const getPortal = catchAsync(async (req, res) => {
  const result = await BillingService.getPortalUrl(req.business, req.body.returnUrl);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Portal URL created',
    data: result
  });
});

/**
 * Get estimated bill for current period
 */
const getEstimatedBill = catchAsync(async (req, res) => {
  const result = await BillingService.getEstimatedBill(req.business);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Estimated bill calculated',
    data: result
  });
});

export const CrmController = {
  createCheckoutSession,
  syncSeats,
  getBillingStatus,
  getInvoices,
  getPortal,
  getEstimatedBill
};

