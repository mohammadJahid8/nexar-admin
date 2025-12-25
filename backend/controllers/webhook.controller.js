import { WebhookService } from '../services/webhook.service.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import httpStatus from 'http-status';


/**
 * Handle Stripe webhook events
 */
const handleStripeWebhook = catchAsync(async (req, res) => {
  const result = await WebhookService.handleWebhook(req.body, req.headers['stripe-signature']);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Webhook processed',
    data: result,
  });
});

export const WebhookController = {
  handleStripeWebhook,
};
