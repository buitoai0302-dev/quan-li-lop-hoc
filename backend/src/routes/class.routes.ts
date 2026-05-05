import { Router } from 'express';
import { getClasses, createClass, updateClass, deleteClass } from '../controllers/class.controller';
import { enforceLimit } from '../middlewares/feature.middleware';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher', 'student']), getClasses);

// Apply the enforceLimit middleware to check if 'max_classes' has been reached
router.post(
  '/', 
  requireRole(['admin', 'staff']),
  enforceLimit('max_classes', 'SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND is_deleted = false'), 
  createClass
);

router.put('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), updateClass);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteClass);

export default router;
