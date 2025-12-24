import express from 'express';
import { WebhookController } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), WebhookController.handleStripeWebhook);

export default router;
