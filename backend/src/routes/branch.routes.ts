import { Router } from 'express';
import { requireFeature } from '../middlewares/feature.middleware';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  updateFirstBranch,
} from '../controllers/branch.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher']), getBranches);
router.put('/first', requireRole(['admin']), updateFirstBranch);

// Create new branch (checked by max_branches limit in controller)
router.post('/', requireRole(['admin']), createBranch);

router.put('/:id', requireRole(['admin']), validateUUID(['id']), updateBranch);
router.delete('/:id', requireRole(['admin']), validateUUID(['id']), deleteBranch);

export default router;
