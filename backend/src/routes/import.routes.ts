import { Router } from 'express';
import { importData } from '../controllers/import.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/:type', requireRole(['admin', 'staff']), importData);

export default router;
