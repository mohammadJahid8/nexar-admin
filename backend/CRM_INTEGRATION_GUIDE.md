# CRM Integration Guide

This document provides instructions for integrating your CRM system with the Billing Admin API.

## Quick Start

1. **Receive your credentials** from Admin:

   - `x-business-id`: Your external business ID (e.g., `acme-corp`)
   - `x-api-key`: Your unique API key (e.g., `nxr_live_abc123...`)

2. **Base URL**: `https://billing-admin.yourcompany.com/api/crm`

- Base url will be in env as CRM_ADMIN_BASE_API_URL

3. **Required Headers** for all requests:
   ```
   x-business-id: your-business-id
   x-api-key: your-api-key
   Content-Type: application/json
   ```

---

## APIs to Implement

### 1. 🔐 Enable Billing (One-Time Setup)

**Purpose**: Initialize billing for your CRM. Redirects the business owner to Stripe Checkout to enter payment details.

**When to Call**: When admin/owner clicks "Enable Billing" button in your CRM.

```http
POST /api/crm/billing/checkout-session
```

**Request Body:**

```json
{
  "successUrl": "https://your-crm.com/billing/success",
  "cancelUrl": "https://your-crm.com/billing/cancel",
  "ownerEmail": "owner@company.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Checkout session created",
  "data": {
    "url": "https://checkout.stripe.com/...",
    "sessionId": "cs_...",
    "expiresAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Implementation:**

```javascript
async function enableBilling(successUrl, cancelUrl, ownerEmail) {
  const response = await fetch(`${API_BASE}/billing/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Business-Id': BUSINESS_ID,
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({ successUrl, cancelUrl, ownerEmail }),
  });

  const data = await response.json();

  // Redirect user to Stripe Checkout
  window.location.href = data.data.url;
}
```

---

### 2. 👥 Sync Seats (REQUIRED - Daily)

**Purpose**: Report the current number of active users to the billing system. **This is the most important API to call!**

**When to Call**:

- ✅ When a user is added
- ✅ When a user is removed/deactivated
- ✅ Once daily (via cron job) to ensure accurate billing

```http
POST /api/crm/billing/seats/sync
```

**Request Body:**

```json
{
  "activeSeatCount": 10,
  "reason": "New employee onboarded" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Seats synced successfully",
  "data": {
    "currentSeatCount": 10,
    "previousSeatCount": 9,
    "delta": 1,
    "seatDaysReported": 9,
    "cumulativeSeatDays": 45
  }
}
```

**Implementation:**

```javascript
// Call this whenever user count changes
async function syncSeats(activeSeatCount, reason = '') {
  const response = await fetch(`${API_BASE}/billing/seats/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Business-Id': BUSINESS_ID,
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({ activeSeatCount, reason }),
  });

  return response.json();
}

// Example: Call when adding a user
async function addUser(userData) {
  await createUser(userData);
  const totalUsers = await getActiveUserCount();
  await syncSeats(totalUsers, 'User added');
}

// Example: Call when removing a user
async function removeUser(userId) {
  await deactivateUser(userId);
  const totalUsers = await getActiveUserCount();
  await syncSeats(totalUsers, 'User removed');
}
```

**Daily Cron Job (Recommended):**

```javascript
// Run once per day at midnight
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  const activeUsers = await getActiveUserCount();
  await syncSeats(activeUsers, 'Daily sync');
  console.log('Daily seat sync completed:', activeUsers);
});
```

---

### 3. 📊 Get Billing Status

**Purpose**: Check if billing is active and get current billing information.

**When to Call**:

- On page load of billing/settings page
- To show billing status in your UI

```http
GET /api/crm/billing/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "billingStatus": "active",
    "seatPriceAudCents": 5000,
    "currentSeatCount": 10,
    "stripeSubscriptionId": "sub_...",
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "cumulativeSeatDays": 45,
    "currentBilledAmount": 75.0,
    "projectedBill": 150.0
  }
}
```

**Implementation:**

```javascript
async function getBillingStatus() {
  const response = await fetch(`${API_BASE}/billing/status`, {
    headers: {
      'X-Business-Id': BUSINESS_ID,
      'X-Api-Key': API_KEY,
    },
  });

  return response.json();
}

// Display billing status
async function showBillingPage() {
  const { data } = await getBillingStatus();

  if (data.billingStatus === 'not_enabled') {
    showEnableBillingButton();
  } else if (data.billingStatus === 'active') {
    showBillingDashboard(data);
  } else if (data.billingStatus === 'past_due') {
    showPaymentWarning();
  }
}
```

---

### 4. 📄 Get Invoices

**Purpose**: List past invoices for the business.

**When to Call**: On billing page to show invoice history.

```http
GET /api/crm/billing/invoices?limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "in_1SgmajP7...",
        "status": "paid",
        "amountDue": 15000,
        "amountPaid": 15000,
        "currency": "aud",
        "hostedInvoiceUrl": "https://invoice.stripe.com/...",
        "invoicePdf": "https://pay.stripe.com/...",
        "created": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Implementation:**

```javascript
async function getInvoices(limit = 10) {
  const response = await fetch(`${API_BASE}/billing/invoices?limit=${limit}`, {
    headers: {
      'X-Business-Id': BUSINESS_ID,
      'X-Api-Key': API_KEY,
    },
  });

  return response.json();
}
```

---

### 5. 🔮 Preview Upcoming Invoice

**Purpose**: Show what the next invoice will look like.

**When to Call**: To display projected billing amount.

```http
GET /api/crm/billing/upcoming
```

**Response:**

```json
{
  "success": true,
  "data": {
    "amountDue": 25000,
    "currency": "aud",
    "periodStart": "2024-02-01T00:00:00.000Z",
    "periodEnd": "2024-03-01T00:00:00.000Z",
    "lines": [
      {
        "description": "150 × CRM Seat (Daily)",
        "amount": 25000,
        "quantity": 150
      }
    ]
  }
}
```

---

### 6. 🏦 Access Billing Portal

**Purpose**: Allow users to manage payment methods, download invoices, etc.

```http
POST /api/crm/billing/portal
```

**Request Body:**

```json
{
  "returnUrl": "https://your-crm.com/billing"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/session/..."
  }
}
```

**Implementation:**

```javascript
async function openBillingPortal() {
  const response = await fetch(`${API_BASE}/billing/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Business-Id': BUSINESS_ID,
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({ returnUrl: window.location.href }),
  });

  const { data } = await response.json();
  window.location.href = data.url;
}
```

---

## Billing Statuses

| Status             | Description                     | Action Required                 |
| ------------------ | ------------------------------- | ------------------------------- |
| `not_enabled`      | Billing not set up              | Call checkout-session to enable |
| `pending_checkout` | Checkout started, not completed | Wait for webhook or retry       |
| `active`           | Subscription active             | ✅ Sync seats regularly         |
| `past_due`         | Payment failed                  | Show warning to admin           |
| `canceled`         | Subscription canceled           | Re-enable billing               |

---

## Best Practices

### ✅ DO:

1. **Sync seats daily** via cron job as backup
2. **Sync immediately** when users are added/removed
3. **Store API credentials securely** (env variables, secrets manager)
4. **Handle errors gracefully** - show user-friendly messages
5. **Cache billing status** to reduce API calls

### ❌ DON'T:

1. **Don't expose API keys** in frontend code
2. **Don't skip syncs** - this will cause inaccurate billing
3. **Don't call APIs from browser** - use backend proxy

---

## Error Handling

All API responses follow this format:

**Success (2xx):**

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

**Error (4xx/5xx):**

```json
{
  "success": false,
  "message": "Error description",
  "error": "DETAILED_ERROR_CODE"
}
```

**Common Errors:**
| Code | Description |
|------|-------------|
| 401 | Invalid or missing API key |
| 403 | Business ID doesn't match API key |
| 409 | Billing already enabled / not enabled |
| 400 | Invalid request body |

---

## Testing

Use these curl commands to test your integration:

```bash
# Test 1: Check billing status
curl http://localhost:5000/api/crm/billing/status \
  -H "X-Business-Id: your-business-id" \
  -H "X-Api-Key: your-api-key"

# Test 2: Sync seats
curl -X POST http://localhost:5000/api/crm/billing/seats/sync \
  -H "Content-Type: application/json" \
  -H "X-Business-Id: your-business-id" \
  -H "X-Api-Key: your-api-key" \
  -d '{"activeSeatCount": 5, "reason": "Test sync"}'

# Test 3: Get invoices
curl http://localhost:5000/api/crm/billing/invoices \
  -H "X-Business-Id: your-business-id" \
  -H "X-Api-Key: your-api-key"
```

---

## Summary: Minimum Implementation

At minimum, your CRM needs to:

1. ✅ **Store credentials** securely
2. ✅ **Call sync-seats API** whenever user count changes
3. ✅ **Set up daily cron** to sync seats as backup
4. ✅ **Provide billing enable button** that calls checkout-session
5. ✅ **Show billing status** to admins
