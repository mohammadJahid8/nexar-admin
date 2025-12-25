import express from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), WebhookController.handleStripeWebhook);

export default router;
