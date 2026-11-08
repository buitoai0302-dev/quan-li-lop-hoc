import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import {
  getTenant,
  updateTenant,
  getApiKey,
  generateApiKey,
} from '../controllers/tenant.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const UpdateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tenant name is required').max(100),
    contact_email: z.string().email('Invalid email format').optional().nullable(),
    settings: z.any().optional().nullable(), // Allow settings objects
  }),
});

const router = Router();

router.get('/', authMiddleware, requireRole(ACCESS.ADMIN), getTenant);
router.put(
  '/',
  authMiddleware,
  requireRole(ACCESS.ADMIN),
  validate(UpdateTenantSchema),
  updateTenant
);
router.get('/api-key', authMiddleware, requireRole(ACCESS.ADMIN), getApiKey);
router.post('/api-key', authMiddleware, requireRole(ACCESS.ADMIN), generateApiKey);

export default router;
