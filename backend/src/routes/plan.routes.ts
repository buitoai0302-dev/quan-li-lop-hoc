import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import {
  getPlans,
  createPlanRequest,
  getPlanRequests,
  approvePlanRequest,
  rejectPlanRequest,
  getPlanRequestStatus,
} from '../controllers/plan.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Publicly available to see plans
router.get('/', getPlans);
router.get('/request/status', authMiddleware, getPlanRequestStatus);

// Request upgrade (Admin of tenant)
router.post('/request', authMiddleware, requireRole(ACCESS.ADMIN_SUPER_ADMIN), createPlanRequest);

// Management (Super Admin only)
router.get('/requests', authMiddleware, requireRole(ACCESS.SYSTEM), getPlanRequests);
router.post(
  '/requests/:id/approve',
  authMiddleware,
  requireRole(ACCESS.SYSTEM),
  approvePlanRequest
);
router.post('/requests/:id/reject', authMiddleware, requireRole(ACCESS.SYSTEM), rejectPlanRequest);

export default router;
