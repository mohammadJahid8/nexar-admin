import express from 'express';
import adminRoutes from './adminRoutes.js';
import crmRoutes from './crmRoutes.js';
import webhookRoutes from './webhookRoutes.js';

const router = express.Router();

// Mount route modules
router.use('/admin', adminRoutes);
router.use('/crm', crmRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
