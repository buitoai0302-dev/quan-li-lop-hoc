import { Router } from 'express';
import {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  googleLogin,
  getMe,
  updateMe,
  completeOnboarding
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.post('/onboarding/complete', authMiddleware, completeOnboarding);

export default router;
