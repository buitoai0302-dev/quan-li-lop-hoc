import { Router } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getRecurringSchedules,
  getEnrollments,
  enrollStudent,
  unenrollStudent,
} from '../controllers/class.controller';
import { enforceLimit } from '../middlewares/feature.middleware';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', requireRole(['admin', 'staff', 'teacher', 'student']), getClasses);
router.get(
  '/:id',
  requireRole(['admin', 'staff', 'teacher', 'student']),
  validateUUID(['id']),
  getClassById
);
router.get(
  '/:id/recurring',
  requireRole(['admin', 'staff', 'teacher']),
  validateUUID(['id']),
  getRecurringSchedules
);
router.get(
  '/:id/students',
  requireRole(['admin', 'staff', 'teacher']),
  validateUUID(['id']),
  getEnrollments
);

// Apply the enforceLimit middleware to check if 'max_classes' has been reached
router.post(
  '/',
  requireRole(['admin', 'staff']),
  enforceLimit(
    'max_classes',
    'SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND is_deleted = false'
  ),
  createClass
);

router.post('/:id/students', requireRole(['admin', 'staff']), validateUUID(['id']), enrollStudent);
router.put('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), updateClass);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteClass);
router.delete(
  '/:id/students/:studentId',
  requireRole(['admin', 'staff']),
  validateUUID(['id', 'studentId']),
  unenrollStudent
);

export default router;
