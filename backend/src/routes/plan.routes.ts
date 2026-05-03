import { Router } from 'express';
import { 
  getPlans, 
  createPlanRequest, 
  getPlanRequests, 
  approvePlanRequest 
} from '../controllers/plan.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Publicly available (for logged in users) to see plans
router.get('/', authMiddleware, getPlans);

// Request upgrade (Admin of tenant)
router.post('/request', authMiddleware, requireRole(['admin', 'super_admin']), createPlanRequest);

// Management (Super Admin only)
router.get('/requests', authMiddleware, requireRole(['super_admin']), getPlanRequests);
router.post('/requests/:id/approve', authMiddleware, requireRole(['super_admin']), approvePlanRequest);

export default router;
