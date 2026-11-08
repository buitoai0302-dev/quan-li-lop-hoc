import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { importData } from '../controllers/import.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/:type', requireRole(ACCESS.ADMIN_STAFF), importData);

export default router;
