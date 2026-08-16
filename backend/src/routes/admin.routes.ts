import { Router, Request, Response } from 'express';
import {
  getSystemStats,
  getAllTenants,
  updateTenant,
  getPlans,
  updatePlanDetails,
  getAllUsers,
  createUser,
  resetUserPassword,
  toggleUserStatus,
} from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All admin routes require super_admin role
router.use(authMiddleware, requireRole(['super_admin']));

router.get('/stats', getSystemStats);
router.get('/tenants', getAllTenants);
router.patch('/tenants/:id', updateTenant);
router.get('/plans', getPlans);
router.put('/plans/:id', updatePlanDetails);

// User Management Routes
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.post('/users/:id/reset-password', resetUserPassword);
router.patch('/users/:id/status', toggleUserStatus);

export default router;
