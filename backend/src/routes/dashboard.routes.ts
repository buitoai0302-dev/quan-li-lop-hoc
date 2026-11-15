import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { getDashboardStats, getActivities } from '../controllers/dashboard.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { workItemsRequestSchema } from '../validators/workflow.validator';
import { getWorkItems } from '../controllers/workflow.controller';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/activities', requireRole(ACCESS.ADMIN_STAFF_TEACHER), getActivities);
router.get(
  '/work-items',
  requireRole(ACCESS.ADMIN_STAFF_TEACHER),
  validate(workItemsRequestSchema),
  getWorkItems
);

export default router;
