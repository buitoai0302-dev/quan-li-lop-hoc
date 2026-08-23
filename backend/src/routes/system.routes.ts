import { Router } from 'express';
import {
  getPublicSettings,
  getAdminSettings,
  updateSettings,
} from '../controllers/system.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  body: z.record(z.string(), z.string()).refine((data) => Object.keys(data).length > 0, {
    message: 'Cần ít nhất một cài đặt để cập nhật',
  }),
});

const router = Router();

// Public endpoint (accessible without login or with any role)
router.get('/settings/public', getPublicSettings);

// Admin endpoints
router.get('/settings', authMiddleware, requireRole(['super_admin']), getAdminSettings);
router.put(
  '/settings',
  authMiddleware,
  requireRole(['super_admin']),
  validate(updateSettingsSchema),
  updateSettings
);

export default router;
