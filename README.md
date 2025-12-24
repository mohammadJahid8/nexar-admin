# CRM Billing Admin System

## Overview

A **centralized billing control plane** for managing Stripe-based subscriptions for multiple CRM businesses. This is a B2B SaaS billing system where:

- **Admin** manages multiple CRM businesses
- **Each CRM business** has users who need to be billed per-seat
- **Stripe** handles payment processing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM Admin (This System)                  │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)      │  Backend (Node.js + Express)│
│  - Dashboard                  │  - Admin APIs               │
│  - Business Management        │  - CRM APIs                 │
│  - Billing Views              │  - Stripe Integration       │
│  - Invoice History            │  - Webhook Handling         │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                     Customer CRMs                            │
│  (External systems that call our APIs to report usage)      │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                        Stripe                                │
│  - Checkout Sessions                                        │
│  - Metered Billing                                          │
│  - Invoices                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Billing Model

**Usage-based daily billing** (per seat/user):

| Concept          | Explanation                           |
| ---------------- | ------------------------------------- |
| **Seat Price**   | e.g., $50/month per user              |
| **Daily Rate**   | $50 ÷ 30 = $1.67/day per user         |
| **Seat-Day**     | 1 user for 1 day = 1 seat-day × $1.67 |
| **Monthly Bill** | Sum of all seat-days × daily rate     |

**Example:**

- 10 users for 5 days: 10 × 5 = 50 seat-days × $1.67 = **$83.50**

---

## Key Features

| Feature                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| **Business Management** | Create, edit, delete CRM businesses           |
| **API Key Generation**  | Unique API keys for each business             |
| **Stripe Integration**  | Checkout sessions, metered billing            |
| **Seat Syncing**        | CRMs report user counts, we calculate billing |
| **Daily Proration**     | Charge only for days users are active         |
| **Invoice History**     | View past payments from Stripe                |
| **Projected Billing**   | Show estimated end-of-period bill             |
| **Daily Billing Job**   | Auto-sync seat-days at midnight               |
| **Webhook Handling**    | Process Stripe events (payments, failures)    |

---

## Project Structure

### Backend

| File                             | Purpose                         |
| -------------------------------- | ------------------------------- |
| `services/stripeService.js`      | Stripe API integration          |
| `services/billingService.js`     | Billing logic (sync, proration) |
| `services/webhookService.js`     | Handle Stripe webhooks          |
| `jobs/dailyBillingJob.js`        | Cron job for daily billing      |
| `controllers/adminController.js` | Admin API handlers              |
| `controllers/crmController.js`   | CRM API handlers                |
| `models/Business.js`             | Business schema                 |
| `models/InvoiceRecord.js`        | Invoice storage                 |
| `models/SeatEventLog.js`         | Seat change history             |
| `utils/daysBetween.js`           | Date calculation helper         |

### Frontend

| File                           | Purpose                    |
| ------------------------------ | -------------------------- |
| `pages/DashboardPage.tsx`      | Overview dashboard         |
| `pages/BusinessesPage.tsx`     | List all businesses        |
| `pages/BusinessDetailPage.tsx` | Business details + billing |
| `pages/CreateBusinessPage.tsx` | Create new business        |

---

## APIs

### Admin APIs (for dashboard)

| Method | Endpoint                       | Purpose               |
| ------ | ------------------------------ | --------------------- |
| POST   | `/api/admin/businesses`        | Create business       |
| GET    | `/api/admin/businesses`        | List businesses       |
| GET    | `/api/admin/businesses/:id`    | Get business details  |
| PATCH  | `/api/admin/businesses/:id`    | Update business       |
| POST   | `/api/admin/billing/run-daily` | Trigger daily billing |

### CRM APIs (for customer integration)

| Method | Endpoint                            | Purpose              |
| ------ | ----------------------------------- | -------------------- |
| POST   | `/api/crm/billing/checkout-session` | Enable billing       |
| POST   | `/api/crm/billing/seats/sync`       | Report user count    |
| GET    | `/api/crm/billing/status`           | Get billing status   |
| GET    | `/api/crm/billing/invoices`         | List invoices        |
| GET    | `/api/crm/billing/upcoming`         | Preview next invoice |
| POST   | `/api/crm/billing/portal`           | Access Stripe portal |

---

## Customer CRM Requirements

What customer CRMs need to implement:

1. **Store API credentials** securely
2. **Call sync-seats API** when users are added/removed
3. **Set up daily cron** to sync as backup
4. **Enable billing button** that opens Stripe Checkout

See `CRM_INTEGRATION_GUIDE.md` for detailed integration instructions.

---

## Running Locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Stripe Webhooks

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

---

## Environment Variables

### Backend (.env)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_API_KEY=your-admin-key
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000
```

---

## Billing Flow

1. **Admin creates a business** with name, external ID, and seat price
2. **CRM receives API key** (shown only once at creation)
3. **Business owner initiates billing** via CRM → calls checkout-session endpoint
4. **Stripe redirects** owner to checkout page
5. **Owner completes payment** method setup
6. **Stripe webhook** notifies system → billing status becomes "active"
7. **CRM syncs seats** as users are added/removed
8. **Daily cron job** reports seat-days to Stripe
9. **Monthly billing** occurs automatically on the 1st

---

## Billing Status Values

| Status             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `not_enabled`      | Business created, billing not yet set up         |
| `pending_checkout` | Checkout session created, waiting for completion |
| `active`           | Subscription active and in good standing         |
| `past_due`         | Payment failed, subscription still active        |
| `canceled`         | Subscription canceled                            |
