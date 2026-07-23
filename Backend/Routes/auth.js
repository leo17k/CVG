import express from 'express';
import * as AuthController from '../Controllers/AuthController.js';

const router = express.Router();

router.post('/login', AuthController.login);
router.get('/check-session', AuthController.checkSession);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

export default router;
