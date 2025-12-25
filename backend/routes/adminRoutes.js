import express from 'express';
import { adminAuth } from '../middleware/index.js';
import { AdminController } from '../controllers/admin.controller.js';


const router = express.Router();

router.use(adminAuth);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Billing Operations
router.post('/billing/run-daily', AdminController.triggerDailyBilling);

// Businesses
router.post('/businesses', AdminController.createBusiness);
router.get('/businesses', AdminController.listBusinesses);
router.get('/businesses/:id', AdminController.getBusiness);
router.patch('/businesses/:id', AdminController.updateBusiness);
router.delete('/businesses/:id', AdminController.deleteBusiness);
router.post('/businesses/:id/reset-api-key', AdminController.resetApiKey);
router.get('/businesses/:id/billing', AdminController.getBusinessBilling);

export default router;
