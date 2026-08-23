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

const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tên chi nhánh không được để trống'),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
});

const updateBranchSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

router.get('/', requireRole(['admin', 'staff', 'teacher']), getBranches);
router.put('/first', requireRole(['admin']), validate(createBranchSchema), updateFirstBranch);

// Create new branch (checked by max_branches limit in controller)
router.post('/', requireRole(['admin']), validate(createBranchSchema), createBranch);

router.put(
  '/:id',
  requireRole(['admin']),
  validateUUID(['id']),
  validate(updateBranchSchema),
  updateBranch
);
router.delete('/:id', requireRole(['admin']), validateUUID(['id']), deleteBranch);

export default router;
