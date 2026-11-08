import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { getDashboardStats, getActivities } from '../controllers/dashboard.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/activities', requireRole(ACCESS.ADMIN_STAFF_TEACHER), getActivities);

export default router;
