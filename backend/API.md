# Nexer Admin API Documentation

Nexer Admin is the central billing control plane for managing CRM businesses and their Stripe-based subscriptions.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Testing Webhooks with Stripe CLI](#testing-webhooks-with-stripe-cli)
- [API Endpoints](#api-endpoints)
  - [Admin Endpoints](#admin-endpoints)
  - [CRM Endpoints](#crm-endpoints)
  - [Webhook Endpoints](#webhook-endpoints)
- [Authentication](#authentication)
- [Example Curl Commands](#example-curl-commands)

---

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nexer-admin

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin Authentication
ADMIN_API_KEY=your-secure-admin-key
```

---

## Running Locally

1. **Install dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

---

## Testing Webhooks with Stripe CLI

1. **Install Stripe CLI:**

   - Windows: `scoop install stripe`
   - macOS: `brew install stripe/stripe-cli/stripe`

2. **Login to Stripe:**

   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**

   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```

4. **Trigger test events:**

   ```bash
   # Test checkout completion
   stripe trigger checkout.session.completed

   # Test invoice payment
   stripe trigger invoice.paid

   # Test subscription update
   stripe trigger customer.subscription.updated
   ```

---

## API Endpoints

### Admin Endpoints

All admin endpoints require the `X-Admin-Api-Key` header.

| Method | Endpoint                                  | Description            |
| ------ | ----------------------------------------- | ---------------------- |
| POST   | `/api/admin/businesses`                   | Create a new business  |
| GET    | `/api/admin/businesses`                   | List all businesses    |
| GET    | `/api/admin/businesses/:id`               | Get a single business  |
| PATCH  | `/api/admin/businesses/:id`               | Update a business      |
| POST   | `/api/admin/businesses/:id/reset-api-key` | Reset business API key |
| GET    | `/api/admin/businesses/:id/billing`       | Get billing summary    |

### CRM Endpoints

All CRM endpoints require `X-Business-Id` and `X-Api-Key` headers.

| Method | Endpoint                            | Description                    |
| ------ | ----------------------------------- | ------------------------------ |
| POST   | `/api/crm/billing/checkout-session` | Create Stripe Checkout session |
| POST   | `/api/crm/billing/seats/sync`       | Sync seat count                |
| GET    | `/api/crm/billing/status`           | Get billing status             |
| GET    | `/api/crm/billing/invoices`         | List invoices                  |
| GET    | `/api/crm/billing/upcoming`         | Preview upcoming invoice       |

### Webhook Endpoints

| Method | Endpoint               | Description            |
| ------ | ---------------------- | ---------------------- |
| POST   | `/api/webhooks/stripe` | Stripe webhook handler |

---

## Authentication

### Admin Authentication

Add the `X-Admin-Api-Key` header to all admin requests:

```
X-Admin-Api-Key: your-admin-api-key
```

### CRM Authentication

Each business has a unique API key. Add these headers to all CRM requests:

```
X-Business-Id: your-business-external-id
X-Api-Key: nxr_live_xxxxx...
```

---

## Example Curl Commands

### Admin: Create a Business

```bash
curl -X POST http://localhost:5000/api/admin/businesses \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: YOUR_ADMIN_KEY" \
  -d '{
    "name": "Acme Corp CRM",
    "externalBusinessId": "acme-corp",
    "contactEmail": "billing@acme.com",
    "seatPriceAudCents": 5000
  }'
```

**Response:**

```json
{
  "message": "Business created successfully",
  "business": {
    "_id": "...",
    "name": "Acme Corp CRM",
    "externalBusinessId": "acme-corp",
    "seatPriceAudCents": 5000,
    "billingStatus": "not_enabled"
  },
  "apiKey": "nxr_live_abc123..."
}
```

### Admin: List Businesses

```bash
curl http://localhost:5000/api/admin/businesses \
  -H "X-Admin-Api-Key: YOUR_ADMIN_KEY"
```

### Admin: Get Business Billing Summary

```bash
curl http://localhost:5000/api/admin/businesses/BUSINESS_ID/billing \
  -H "X-Admin-Api-Key: YOUR_ADMIN_KEY"
```

### Admin: Reset API Key

```bash
curl -X POST http://localhost:5000/api/admin/businesses/BUSINESS_ID/reset-api-key \
  -H "X-Admin-Api-Key: YOUR_ADMIN_KEY"
```

---

### CRM: Create Checkout Session

```bash
curl -X POST http://localhost:5000/api/crm/billing/checkout-session \
  -H "Content-Type: application/json" \
  -H "X-Business-Id: acme-corp" \
  -H "X-Api-Key: nxr_live_abc123..." \
  -d '{
    "successUrl": "https://crm.acme.com/billing/success",
    "cancelUrl": "https://crm.acme.com/billing/cancel",
    "ownerEmail": "owner@acme.com"
  }'
```

**Response:**

```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_...",
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

### CRM: Sync Seats

```bash
curl -X POST http://localhost:5000/api/crm/billing/seats/sync \
  -H "Content-Type: application/json" \
  -H "X-Business-Id: acme-corp" \
  -H "X-Api-Key: nxr_live_abc123..." \
  -d '{
    "activeSeatCount": 5,
    "reason": "New employee onboarded"
  }'
```

**Response:**

```json
{
  "message": "Seats synced successfully",
  "currentSeatCount": 5,
  "previousSeatCount": 4,
  "delta": 1
}
```

### CRM: Get Billing Status

```bash
curl http://localhost:5000/api/crm/billing/status \
  -H "X-Business-Id: acme-corp" \
  -H "X-Api-Key: nxr_live_abc123..."
```

**Response:**

```json
{
  "billingStatus": "active",
  "seatPriceAudCents": 5000,
  "currentSeatCount": 5,
  "stripeSubscriptionId": "sub_...",
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "nextInvoiceDate": "2024-02-01T00:00:00.000Z"
}
```

### CRM: List Invoices

```bash
curl "http://localhost:5000/api/crm/billing/invoices?limit=10" \
  -H "X-Business-Id: acme-corp" \
  -H "X-Api-Key: nxr_live_abc123..."
```

### CRM: Preview Upcoming Invoice

```bash
curl http://localhost:5000/api/crm/billing/upcoming \
  -H "X-Business-Id: acme-corp" \
  -H "X-Api-Key: nxr_live_abc123..."
```

**Response:**

```json
{
  "amountDue": 25000,
  "currency": "aud",
  "periodStart": "2024-02-01T00:00:00.000Z",
  "periodEnd": "2024-03-01T00:00:00.000Z",
  "nextPaymentAttempt": "2024-02-01T00:00:00.000Z",
  "lines": [
    {
      "description": "5 × Nexer CRM Seat (Feb 1 – Mar 1, 2024)",
      "amount": 25000,
      "quantity": 5,
      "proration": false
    }
  ]
}
```

---

## Billing Flow

1. **Admin creates a business** with name, external ID, and seat price
2. **CRM receives API key** (shown only once at creation)
3. **Business owner initiates billing** via CRM → calls checkout-session endpoint
4. **Stripe redirects** owner to checkout page
5. **Owner completes payment** method setup
6. **Stripe webhook** notifies Nexer Admin → billing status becomes "active"
7. **CRM syncs seats** as users are added/removed
8. **Monthly billing** occurs automatically on the 1st, prorated for seat changes

---

## Billing Status Values

| Status             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `not_enabled`      | Business created, billing not yet set up         |
| `pending_checkout` | Checkout session created, waiting for completion |
| `active`           | Subscription active and in good standing         |
| `past_due`         | Payment failed, subscription still active        |
| `canceled`         | Subscription canceled                            |

---

## Known Limitations

1. **Price Changes**: Changing `seatPriceAudCents` after billing is enabled does not update the existing subscription. The new price only applies to new checkout sessions.

2. **Single Product**: All businesses share the same product ("Nexer CRM Seat") but with different prices.

3. **Timezone**: Billing cycle anchor is set to the next 1st of the month in UTC.
