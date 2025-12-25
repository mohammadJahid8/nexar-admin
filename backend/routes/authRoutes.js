import express from 'express';
import * as AuthController from '../controllers/auth.controller.js';

const router = express.Router();

// Public routes
router.post('/login', AuthController.login);
router.get('/me', AuthController.getMe);

export default router;
