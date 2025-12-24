import httpStatus from 'http-status';
import { Business, StripeEvent, InvoiceRecord } from '../models/index.js';
import { constructWebhookEvent } from './stripeService.js';
import { activateBilling } from './billingService.js';

/**
 * Handle Stripe webhook events
 */
export const handleWebhook = async (payload, signature) => {
  if (!signature) {
    const error = new Error('Missing Stripe signature');
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  let event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    const error = new Error(`Webhook verification failed: ${err.message}`);
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  // Idempotency
  const isProcessed = await StripeEvent.isProcessed(event.id);
  if (isProcessed) {
    console.log(`Event ${event.id} already processed`);
    return { received: true, skipped: true };
  }

  console.log(`Processing: ${event.type}`);

  let businessId = null;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        businessId = await handleCheckoutCompleted(event.data.object);
        break;

      case 'invoice.paid':
        businessId = await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        businessId = await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.deleted':
        businessId = await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`Unhandled: ${event.type}`);
    }

    await StripeEvent.markProcessed(event.id, event.type, event.created, businessId);
    return { received: true };
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err.message);
    await StripeEvent.markProcessed(event.id, event.type, event.created, businessId, err.message);
    throw err;
  }
};

/**
 * Handle setup checkout completed
 */
async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id, 'mode:', session.mode);

  const businessId = session.metadata?.nexer_business_id;
  if (!businessId) {
    console.log('No business ID in metadata');
    return null;
  }

  const business = await Business.findById(businessId);
  if (!business) {
    console.log('Business not found:', businessId);
    return businessId;
  }

  // Update customer ID if needed
  if (session.customer && !business.stripeCustomerId) {
    business.stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer.id;
    await business.save();
  }

  // Setup mode = create subscription
  if (session.mode === 'setup') {
    try {
      await activateBilling(businessId);
    } catch (err) {
      console.error('Activate billing failed:', err.message);
      throw err;
    }
  }

  return business._id;
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(invoice) {
  const business = await Business.findOne({ stripeCustomerId: invoice.customer });
  if (!business) return null;

  // Always set to active when invoice is paid
  business.billingStatus = 'active';

  // Reset cumulative tracking for new billing period
  business.cumulativeSeatDays = 0;

  // Update period dates from invoice if available
  if (invoice.period_start) {
    business.currentPeriodStart = new Date(invoice.period_start * 1000);
  }
  if (invoice.period_end) {
    business.currentPeriodEnd = new Date(invoice.period_end * 1000);
  }

  // Reset the usage sync timestamp to start of new period
  business.lastUsageSyncAt = new Date();

  await business.save();
  await InvoiceRecord.upsertFromStripeInvoice(business._id, invoice);

  console.log(`[Webhook] Invoice paid for ${business.externalBusinessId}, reset billing period`);
  return business._id;
}

/**
 * Handle payment failed
 */
async function handleInvoicePaymentFailed(invoice) {
  const business = await Business.findOne({ stripeCustomerId: invoice.customer });
  if (!business) return null;

  business.billingStatus = 'past_due';
  await business.save();
  await InvoiceRecord.upsertFromStripeInvoice(business._id, invoice);
  return business._id;
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  const business = await Business.findOne({ stripeSubscriptionId: subscription.id });
  if (!business) return null;

  business.billingStatus = 'canceled';
  await business.save();
  return business._id;
}

export const WebhookService = { handleWebhook };
