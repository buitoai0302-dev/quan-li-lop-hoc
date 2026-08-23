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
  completeOnboarding,
  refreshToken,
  logout,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { LoginSchema, RegisterSchema } from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/login', validate(LoginSchema), login);
router.post('/google', googleLogin);
router.post('/register', validate(RegisterSchema), register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshToken); // Lấy access token mới bằng refresh token
router.post('/logout', logout); // Thu hồi refresh token

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.post('/onboarding/complete', authMiddleware, completeOnboarding);

export default router;
