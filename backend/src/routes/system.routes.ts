import { ACCESS } from '../utils/permissions';
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
  body: z
    .object({
      SYSTEM_NAME: z.string().trim().max(120).optional(),
      LEGAL_ENTITY_NAME: z.string().trim().max(200).optional(),
      CONTACT_EMAIL: z.union([z.literal(''), z.email()]).optional(),
      CONTACT_PHONE: z.string().trim().max(40).optional(),
      CONTACT_ZALO: z
        .union([
          z.literal(''),
          z
            .string()
            .url()
            .refine((value) => value.startsWith('https://zalo.me/')),
        ])
        .optional(),
      CONTACT_ADDRESS: z.string().trim().max(500).optional(),
      TAX_CODE: z.string().trim().max(30).optional(),
      POSTAL_CODE: z.string().trim().max(30).optional(),
      LEGAL_EFFECTIVE_DATE: z.union([z.literal(''), z.iso.date()]).optional(),
      LEGAL_PUBLISHED: z.enum(['true', 'false']).optional(),
      PRIVACY_POLICY_VI: z.string().max(30000).optional(),
      PRIVACY_POLICY_EN: z.string().max(30000).optional(),
      TERMS_OF_SERVICE_VI: z.string().max(30000).optional(),
      TERMS_OF_SERVICE_EN: z.string().max(30000).optional(),
      PAYMENT_BANK_ID: z.string().trim().max(100).optional(),
      PAYMENT_BANK_NAME: z.string().trim().max(150).optional(),
      PAYMENT_ACCOUNT_NUMBER: z.string().trim().max(100).optional(),
      PAYMENT_ACCOUNT_NAME: z.string().trim().max(150).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Cần ít nhất một cài đặt để cập nhật',
    }),
});

const router = Router();

// Public endpoint (accessible without login or with any role)
router.get('/settings/public', getPublicSettings);

// Admin endpoints
router.get('/settings', authMiddleware, requireRole(ACCESS.SYSTEM), getAdminSettings);
router.put(
  '/settings',
  authMiddleware,
  requireRole(ACCESS.SYSTEM),
  validate(updateSettingsSchema),
  updateSettings
);

export default router;
