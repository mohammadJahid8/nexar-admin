import express from 'express';
import * as AuthController from '../controllers/auth.controller.js';
import adminAuth, { requireRole } from '../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(adminAuth);

router.get('/', AuthController.getUsers);
router.post('/', requireRole('super_admin'), AuthController.createUser);
router.delete('/:id', requireRole('super_admin'), AuthController.deleteUser);

export default router;
