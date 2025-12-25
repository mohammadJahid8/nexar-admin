import express from 'express';
import { crmAuth, rateLimiter } from '../middleware/index.js';
import { CrmController } from '../controllers/crm.controller.js';

const router = express.Router();

router.use(crmAuth);
router.use(rateLimiter);

// Enable billing (setup checkout - no charge)
router.post('/billing/checkout-session', CrmController.createCheckoutSession);

// Sync seat count (reports usage to Stripe)
router.post('/billing/seats/sync', CrmController.syncSeats);

// Get billing status
router.get('/billing/status', CrmController.getBillingStatus);

// Get estimated bill for current period
router.get('/billing/estimate', CrmController.getEstimatedBill);

// Get invoices
router.get('/billing/invoices', CrmController.getInvoices);

// Get billing portal URL (for updating payment method)
router.post('/billing/portal', CrmController.getPortal);

export default router;
