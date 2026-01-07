import Stripe from 'stripe';

let stripeInstance = null;

function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }
  return stripeInstance;
}

export const stripe = { get instance() { return getStripe(); } };

/**
 * Get or create an inclusive 10% Australian GST tax rate
 * This tax rate is shared across all businesses
 */
async function getOrCreateGstTaxRate() {
  console.log('Getting or creating GST tax rate');
  // Search for existing active inclusive GST tax rate
  const taxRates = await stripe.instance.taxRates.list({ active: true, limit: 100 });
  const existing = taxRates.data.find(tr =>
    tr.display_name === 'GST' &&
    tr.percentage === 10 &&
    tr.inclusive === true &&
    tr.country === 'AU'
  );

  if (existing) {
    console.log('Found existing GST tax rate:', existing.id);
    return existing.id;
  }

  // Create new inclusive GST tax rate
  const taxRate = await stripe.instance.taxRates.create({
    display_name: 'GST',
    description: 'Australian Goods and Services Tax (included in price)',
    percentage: 10,
    inclusive: true,
    country: 'AU',
    tax_type: 'gst',
  });

  console.log('Created GST tax rate:', taxRate.id);
  return taxRate.id;
}

/**
 * Get or create metered price
 */
async function getOrCreateMeteredPrice(businessId, seatPriceAudCents) {
  const prices = await stripe.instance.prices.search({
    query: `metadata['nexer_business_id']:'${businessId}' AND active:'true'`
  });

  if (prices.data.length > 0) {
    console.log('Found existing price:', prices.data[0].id);
    return prices.data[0].id;
  }

  const dailyRate = Math.round(seatPriceAudCents / 30);
  console.log('Daily rate:', dailyRate, 'cents');

  const product = await stripe.instance.products.create({
    name: 'CRM Seat (Daily)',
    metadata: { nexer_business_id: businessId }
  });

  const price = await stripe.instance.prices.create({
    product: product.id,
    currency: 'aud',
    unit_amount: dailyRate,
    tax_behavior: 'inclusive',
    recurring: {
      interval: 'month',
      usage_type: 'metered',
      aggregate_usage: 'sum'
    },
    metadata: {
      nexer_business_id: businessId,
      daily_rate: dailyRate.toString()
    }
  });

  console.log('Created metered price:', price.id);
  return price.id;
}

/**
 * Create a Stripe Customer
 */
export const createCustomer = async (business) => {
  return stripe.instance.customers.create({
    email: business.contactEmail || undefined,
    name: business.name,
    metadata: {
      nexer_business_id: business._id.toString(),
      external_business_id: business.externalBusinessId
    }
  });
};

/**
 * Create Setup Checkout
 */
export const createSetupCheckout = async ({ business, successUrl, cancelUrl, initialUserIds }) => {
  const metadata = {
    nexer_business_id: business._id.toString(),
    external_business_id: business.externalBusinessId
  };

  // Store initial user IDs if provided (for per-user billing)
  if (Array.isArray(initialUserIds) && initialUserIds.length > 0) {
    metadata.initial_user_ids = JSON.stringify(initialUserIds);
  }

  return stripe.instance.checkout.sessions.create({
    mode: 'setup',
    customer: business.stripeCustomerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: ['card'],
    metadata
  });
};

/**
 * Create metered subscription
 */
export const createMeteredSubscription = async ({ customerId, businessId, externalBusinessId, seatPriceAudCents }) => {
  console.log('Creating metered subscription for:', businessId);

  const priceId = await getOrCreateMeteredPrice(businessId, seatPriceAudCents);
  const gstTaxRateId = await getOrCreateGstTaxRate();

  const paymentMethods = await stripe.instance.paymentMethods.list({
    customer: customerId,
    type: 'card',
    limit: 1
  });

  if (paymentMethods.data.length > 0) {
    await stripe.instance.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethods.data[0].id }
    });
  }

  // Set billing cycle anchor to the 1st of the NEXT month
  const now = new Date();
  const nextFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const billingCycleAnchor = Math.floor(nextFirst.getTime() / 1000);

  const subscription = await stripe.instance.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId, tax_rates: [gstTaxRateId] }],
    billing_cycle_anchor: billingCycleAnchor,
    proration_behavior: 'none',
    metadata: {
      nexer_business_id: businessId,
      external_business_id: externalBusinessId
    }
  });

  console.log('Subscription created:', subscription.id);
  return subscription;
};

/**
 * Report seat-days usage using rawRequest with retry logic
 */
export const reportSeatDays = async (subscriptionItemId, seatDays, maxRetries = 3) => {
  console.log('Reporting usage:', seatDays, 'seat-days to', subscriptionItemId);

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await stripe.instance.rawRequest('POST', `/v1/subscription_items/${subscriptionItemId}/usage_records`, {
        quantity: seatDays,
        action: 'increment',
        timestamp: Math.floor(Date.now() / 1000)
      });

      console.log('Usage reported successfully:', response);
      return response;
    } catch (err) {
      lastError = err;

      const isRateLimit = err.statusCode === 429;
      const isServerError = err.statusCode >= 500;
      const isNetworkError = !err.statusCode;

      if (!isRateLimit && !isServerError && !isNetworkError) {
        console.error('Non-retryable error:', err.message);
        throw err;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('All retry attempts failed:', lastError.message);
  throw lastError;
};

/**
 * Get subscription details
 */
export const getSubscription = async (subscriptionId) => {
  return stripe.instance.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice']
  });
};

/**
 * List invoices for customer
 */
export const listInvoices = async (customerId, limit = 10) => {
  return stripe.instance.invoices.list({
    customer: customerId,
    limit
  });
};

/**
 * Get upcoming invoice using raw API call
 */
export const getUpcomingInvoice = async (customerId) => {
  try {
    const response = await stripe.instance.rawRequest('GET', `/v1/invoices/upcoming?customer=${customerId}`);
    // console.log('🚀 ~ getUpcomingInvoice ~ response:', response);
    return response;
  } catch (err) {
    if (err.code === 'invoice_upcoming_none') {
      return null;
    }
    console.error('Failed to fetch upcoming invoice:', err.message);
    return null;
  }
};

/**
 * Create billing portal session
 */
export const createBillingPortal = async (customerId, returnUrl) => {
  return stripe.instance.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
};

export const cancelSubscription = async (subscriptionId) => {
  if (!subscriptionId) return null;

  try {
    return await stripe.instance.subscriptions.cancel(subscriptionId);
  } catch (err) {
    console.error('Failed to cancel subscription:', err.message);
    throw err;
  }
};

/**
 * Update subscription to use a new price
 */
export const updateSubscriptionPrice = async (subscriptionId, subscriptionItemId, businessId, newSeatPriceAudCents) => {
  console.log('Updating subscription price for:', businessId, 'to', newSeatPriceAudCents, 'cents');

  const newDailyRate = Math.round(newSeatPriceAudCents / 30);

  const oldPrices = await stripe.instance.prices.search({
    query: `metadata['nexer_business_id']:'${businessId}' AND active:'true'`
  });

  let productId;
  if (oldPrices.data.length > 0) {
    productId = oldPrices.data[0].product;
  } else {
    const product = await stripe.instance.products.create({
      name: 'CRM Seat (Daily)',
      metadata: { nexer_business_id: businessId }
    });
    productId = product.id;
  }

  const newPrice = await stripe.instance.prices.create({
    product: productId,
    currency: 'aud',
    unit_amount: newDailyRate,
    tax_behavior: 'inclusive',
    recurring: {
      interval: 'month',
      usage_type: 'metered',
      aggregate_usage: 'sum'
    },
    metadata: {
      nexer_business_id: businessId,
      daily_rate: newDailyRate.toString()
    }
  });

  console.log('Created new price:', newPrice.id, 'with daily rate:', newDailyRate);

  // Get GST tax rate for updated subscription item
  const gstTaxRateId = await getOrCreateGstTaxRate();

  const updatedSubscription = await stripe.instance.subscriptions.update(subscriptionId, {
    items: [{
      id: subscriptionItemId,
      price: newPrice.id,
      tax_rates: [gstTaxRateId],
    }],
    proration_behavior: 'none',
  });

  for (const oldPrice of oldPrices.data) {
    if (oldPrice.id !== newPrice.id) {
      try {
        await stripe.instance.prices.update(oldPrice.id, { active: false });
        console.log('Archived old price:', oldPrice.id);
      } catch (err) {
        console.warn('Could not archive old price:', oldPrice.id, err.message);
      }
    }
  }

  return updatedSubscription;
};

/**
 * Construct webhook event
 */
export const constructWebhookEvent = (payload, signature) => {
  return stripe.instance.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};