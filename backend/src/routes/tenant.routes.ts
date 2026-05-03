import { Router } from 'express';
import { getTenant, updateTenant, getApiKey, generateApiKey } from '../controllers/tenant.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, requireRole(['admin']), getTenant);
router.put('/', authMiddleware, requireRole(['admin']), updateTenant);
router.get('/api-key', authMiddleware, requireRole(['admin']), getApiKey);
router.post('/api-key', authMiddleware, requireRole(['admin']), generateApiKey);

export default router;
