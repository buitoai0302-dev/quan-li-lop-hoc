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

// Publicly available (for logged in users) to see plans
router.get('/', authMiddleware, getPlans);
router.get('/request/status', authMiddleware, getPlanRequestStatus);

// Request upgrade (Admin of tenant)
router.post('/request', authMiddleware, requireRole(['admin', 'super_admin']), createPlanRequest);

// Management (Super Admin only)
router.get('/requests', authMiddleware, requireRole(['super_admin']), getPlanRequests);
router.post(
  '/requests/:id/approve',
  authMiddleware,
  requireRole(['super_admin']),
  approvePlanRequest
);
router.post(
  '/requests/:id/reject',
  authMiddleware,
  requireRole(['super_admin']),
  rejectPlanRequest
);

export default router;
