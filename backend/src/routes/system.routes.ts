import { Router } from 'express';
import {
  getPublicSettings,
  getAdminSettings,
  updateSettings,
} from '../controllers/system.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public endpoint (accessible without login or with any role)
router.get('/settings/public', getPublicSettings);

// Admin endpoints
router.get('/settings', authMiddleware, requireRole(['super_admin']), getAdminSettings);
router.put('/settings', authMiddleware, requireRole(['super_admin']), updateSettings);

export default router;
