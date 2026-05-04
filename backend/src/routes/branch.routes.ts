import { Router } from 'express';
import { requireFeature } from '../middlewares/feature.middleware';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branch.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher']), getBranches);

// Only tenants with the 'multi_branch' feature can create new branches
router.post('/', requireFeature('multi_branch'), requireRole(['admin']), createBranch);

router.put('/:id', requireRole(['admin']), validateUUID(['id']), updateBranch);
router.delete('/:id', requireRole(['admin']), validateUUID(['id']), deleteBranch);

export default router;
