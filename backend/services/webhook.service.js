import httpStatus from 'http-status';
import { Business, StripeEvent, InvoiceRecord, SeatEventLog } from '../models/index.js';
import { constructWebhookEvent } from './stripe.service.js';
import { activateBilling } from './billing.service.js';

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

      case 'customer.subscription.updated':
        businessId = await handleSubscriptionUpdated(event.data.object);
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

      // Create initial UserSeat records if initialUserIds were provided
      const initialUserIdsStr = session.metadata?.initial_user_ids;
      if (initialUserIdsStr) {
        try {
          const initialUserIds = JSON.parse(initialUserIdsStr);
          if (Array.isArray(initialUserIds) && initialUserIds.length > 0) {
            const { UserSeat } = await import('../models/index.js');

            const now = new Date();
            for (const userId of initialUserIds) {
              await UserSeat.findOneAndUpdate(
                { businessId: business._id, externalUserId: userId },
                {
                  businessId: business._id,
                  externalUserId: userId,
                  activatedAt: now,
                  deactivatedAt: null,
                  lastBilledAt: null,
                  cumulativeDays: 0
                },
                { upsert: true, new: true }
              );
            }

            // Update business seat count
            business.currentSeatCount = initialUserIds.length;
            await business.save();

            // Log the initial seat setup
            await SeatEventLog.logChange(
              business._id,
              0,  // Previous count
              initialUserIds.length,
              `Billing enabled with ${initialUserIds.length} initial user(s)`,
              'billing-activation'
            );

            console.log(`Created ${initialUserIds.length} initial UserSeat records`);
          }
        } catch (parseErr) {
          console.error('Failed to parse initial_user_ids:', parseErr.message);
        }
      }
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
 * Handle subscription updated
 * This handles status changes including scheduled cancellations
 */
async function handleSubscriptionUpdated(subscription) {
  let business = await Business.findOne({ stripeSubscriptionId: subscription.id });
  if (!business) {
    // Try finding by customer ID as fallback
    business = await Business.findOne({ stripeCustomerId: subscription.customer });
    if (!business) return null;

    // Update subscription ID if it was missing
    business.stripeSubscriptionId = subscription.id;
  }

  // Map Stripe subscription status to our billing status
  const previousStatus = business.billingStatus;

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      business.billingStatus = 'active';
      break;
    case 'past_due':
    case 'unpaid':
      business.billingStatus = 'past_due';
      break;
    case 'canceled':
    case 'incomplete_expired':
      business.billingStatus = 'canceled';
      break;
    case 'incomplete':
    case 'paused':
      business.billingStatus = 'pending_checkout';
      break;
  }

  // Track if subscription is scheduled to cancel at period end
  if (subscription.cancel_at_period_end) {
    business.cancelAtPeriodEnd = true;
    business.cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;
    console.log(`[Webhook] Subscription ${subscription.id} scheduled to cancel at ${business.cancelAt}`);
  } else {
    // Subscription was un-canceled (reactivated)
    business.cancelAtPeriodEnd = false;
    business.cancelAt = null;
    if (previousStatus !== business.billingStatus) {
      console.log(`[Webhook] Subscription ${subscription.id} reactivated`);
    }
  }

  // Update period dates if available
  if (subscription.current_period_start) {
    business.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  }
  if (subscription.current_period_end) {
    business.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }

  await business.save();
  console.log(`[Webhook] Subscription updated for ${business.externalBusinessId}: ${previousStatus} -> ${business.billingStatus}`);
  return business._id;
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  const business = await Business.findOne({ stripeSubscriptionId: subscription.id });
  if (!business) return null;

  business.billingStatus = 'canceled';
  business.cancelAtPeriodEnd = false;
  business.cancelAt = null;
  await business.save();
  return business._id;
}

export const WebhookService = { handleWebhook };
