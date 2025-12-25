import express from 'express';
import adminRoutes from './adminRoutes.js';
import crmRoutes from './crmRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import authRoutes from './authRoutes.js';
import adminUserRoutes from './adminUserRoutes.js';

const router = express.Router();

// Public auth routes (login)
router.use('/auth', authRoutes);

// Protected admin routes
router.use('/admin', adminRoutes);
router.use('/admin/users', adminUserRoutes);

// CRM routes
router.use('/crm', crmRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
