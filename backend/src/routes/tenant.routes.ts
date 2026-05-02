import { Router } from 'express';
import { getTenant, updateTenant } from '../controllers/tenant.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireRole(['admin']), getTenant);
router.put('/', requireRole(['admin']), updateTenant);

export default router;
