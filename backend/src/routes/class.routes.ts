import { ACCESS } from '../utils/permissions';
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
import { validateUUID, validate } from '../middlewares/validate.middleware';
import {
  createClassSchema,
  updateClassSchema,
  enrollStudentSchema,
} from '../validators/class.validator';

const router = Router();

router.get('/', requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT_API), getClasses);
router.get(
  '/:id',
  requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT),
  validateUUID(['id']),
  getClassById
);
router.get(
  '/:id/recurring',
  requireRole(ACCESS.ADMIN_STAFF_TEACHER),
  validateUUID(['id']),
  getRecurringSchedules
);
router.get(
  '/:id/students',
  requireRole(ACCESS.ADMIN_STAFF_TEACHER),
  validateUUID(['id']),
  getEnrollments
);

// Apply the enforceLimit middleware to check if 'max_classes' has been reached
router.post(
  '/',
  requireRole(ACCESS.ADMIN_STAFF),
  enforceLimit(
    'max_classes',
    'SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND is_deleted = false'
  ),
  validate(createClassSchema),
  createClass
);

router.post(
  '/:id/students',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id']),
  validate(enrollStudentSchema),
  enrollStudent
);
router.put(
  '/:id',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id']),
  validate(updateClassSchema),
  updateClass
);
router.delete('/:id', requireRole(ACCESS.ADMIN_STAFF), validateUUID(['id']), deleteClass);
router.delete(
  '/:id/students/:studentId',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id', 'studentId']),
  unenrollStudent
);

export default router;
