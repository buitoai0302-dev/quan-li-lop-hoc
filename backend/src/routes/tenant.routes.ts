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

router.get('/', authMiddleware, requireRole(['admin']), getTenant);
router.put('/', authMiddleware, requireRole(['admin']), validate(UpdateTenantSchema), updateTenant);
router.get('/api-key', authMiddleware, requireRole(['admin']), getApiKey);
router.post('/api-key', authMiddleware, requireRole(['admin']), generateApiKey);

export default router;
