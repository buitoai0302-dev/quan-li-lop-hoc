import { Router, Request, Response } from 'express';
import {
  getSystemStats,
  getAllTenants,
  updateTenant,
  getPlans,
  updatePlanDetails,
} from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All admin routes require super_admin role
router.use(authMiddleware, requireRole(['super_admin', 'admin']));

router.get('/stats', getSystemStats);
router.get('/tenants', getAllTenants);
router.patch('/tenants/:id', updateTenant);
router.get('/plans', getPlans);
router.put('/plans/:id', updatePlanDetails);

export default router;
