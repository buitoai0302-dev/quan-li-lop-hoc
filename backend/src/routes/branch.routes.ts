import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  updateFirstBranch,
} from '../controllers/branch.controller';

const router = Router();

const branchBodySchema = z.object({
  name: z.string().min(1, 'Tên chi nhánh không được để trống'),
  address: z.string().optional(),
  phone: z.string().optional(),
});
const createBranchSchema = z.object({ body: branchBodySchema });

const updateBranchSchema = z.object({
  body: branchBodySchema.partial().extend({
    is_active: z.boolean().optional(),
  }),
});

router.get('/', requireRole(ACCESS.ADMIN_STAFF_TEACHER), getBranches);
router.put('/first', requireRole(ACCESS.ADMIN), validate(createBranchSchema), updateFirstBranch);

// Create new branch (checked by max_branches limit in controller)
router.post('/', requireRole(ACCESS.ADMIN), validate(createBranchSchema), createBranch);

router.put(
  '/:id',
  requireRole(ACCESS.ADMIN),
  validateUUID(['id']),
  validate(updateBranchSchema),
  updateBranch
);
router.delete('/:id', requireRole(ACCESS.ADMIN), validateUUID(['id']), deleteBranch);

export default router;
