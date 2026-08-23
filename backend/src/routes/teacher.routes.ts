import { Router } from 'express';
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
} from '../controllers/teacher.controller';
import { enforceLimit } from '../middlewares/feature.middleware';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const createTeacherSchema = z.object({
  body: z.object({
    full_name: z.string().min(1, 'Tên nhân sự không được để trống'),
    email: z.string().email('Email không hợp lệ'),
    phone: z.string().optional(),
    specialization: z.string().optional(),
    branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
  }),
});

const updateTeacherSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).optional(),
    phone: z.string().optional(),
    specialization: z.string().optional(),
    branch_id: z.string().uuid().optional(),
    is_active: z.boolean().optional(),
  }),
});

router.get('/', requireRole(['admin', 'staff', 'teacher', 'student']), getTeachers);

// Check if max_teachers is reached before creating
router.post(
  '/',
  requireRole(['admin']),
  enforceLimit(
    'max_teachers',
    'SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND is_active = true'
  ),
  validate(createTeacherSchema),
  createTeacher
);

router.put(
  '/:id',
  requireRole(['admin']),
  validateUUID(['id']),
  validate(updateTeacherSchema),
  updateTeacher
);
router.delete('/:id', requireRole(['admin']), validateUUID(['id']), deleteTeacher);
router.post(
  '/:id/reset-password',
  requireRole(['admin']),
  validateUUID(['id']),
  resetTeacherPassword
);

export default router;
