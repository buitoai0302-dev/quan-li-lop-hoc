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
  importUsers,
} from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const UpdateAdminTenantSchema = z.object({
  body: z
    .object({
      planId: z.string().uuid().optional(),
      isActive: z.boolean().optional(),
      status: z.enum(['active', 'pending', 'suspended']).optional(),
      settings: z.any().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required (planId, isActive, status, or settings)',
    }),
});

const UpdatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    priceVnd: z.number().min(0).optional(),
    priceUsd: z.number().min(0).optional(),
    yearlyPriceVnd: z.number().min(0).optional(),
    yearlyPriceUsd: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    limits: z.record(z.string(), z.number()).optional(),
    features: z.record(z.string(), z.boolean()).optional(),
  }),
});

const CreateUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'staff', 'teacher', 'student']),
    full_name: z.string().min(1),
    tenant_id: z.string().uuid().or(z.literal('NEW')),
    new_tenant_name: z.string().optional(),
    plan_id: z.string().uuid().optional(),
    password: z.string().optional(),
  }),
});

const ResetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(8).optional(), // Can generate random if not provided
  }),
});

const router = Router();

// All admin routes require super_admin role
router.use(authMiddleware, requireRole(['super_admin']));

router.get('/stats', getSystemStats);
router.get('/tenants', getAllTenants);
router.patch('/tenants/:id', validate(UpdateAdminTenantSchema), updateTenant);
router.get('/plans', getPlans);
router.put('/plans/:id', validate(UpdatePlanSchema), updatePlanDetails);

// User Management Routes
router.get('/users', getAllUsers);
router.post('/users/import', importUsers);
router.post('/users', validate(CreateUserSchema), createUser);
router.post('/users/:id/reset-password', validate(ResetPasswordSchema), resetUserPassword);
router.patch('/users/:id/status', toggleUserStatus);

export default router;
