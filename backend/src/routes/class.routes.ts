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
import { z } from 'zod';

const recurringScheduleSchema = z.object({
  day_of_week: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  room_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createClassSchema = z.object({
  body: z.object({
    branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
    subject_id: z.string().uuid().optional().nullable(),
    teacher_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1, 'Tên lớp không được để trống'),
    max_capacity: z.number().int().positive().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    recurring_schedules: z.array(recurringScheduleSchema).optional(),
    enrollments: z.array(z.string().uuid()).optional(),
  }),
});

const updateClassSchema = z.object({
  body: z.object({
    branch_id: z.string().uuid().optional(),
    subject_id: z.string().uuid().optional().nullable(),
    teacher_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1).optional(),
    max_capacity: z.number().int().positive().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    status: z.string().optional(),
    recurring_schedules: z.array(recurringScheduleSchema).optional(),
    enrollments: z.array(z.string().uuid()).optional(),
  }),
});

const enrollStudentSchema = z.object({
  body: z
    .object({
      student_id: z.string().uuid().optional(),
      student_ids: z.array(z.string().uuid()).optional(),
    })
    .refine((data) => data.student_id || (data.student_ids && data.student_ids.length > 0), {
      message: 'Vui lòng cung cấp ít nhất một học sinh (student_id hoặc student_ids)',
    }),
});

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
  validate(createClassSchema),
  createClass
);

router.post(
  '/:id/students',
  requireRole(['admin', 'staff']),
  validateUUID(['id']),
  validate(enrollStudentSchema),
  enrollStudent
);
router.put(
  '/:id',
  requireRole(['admin', 'staff']),
  validateUUID(['id']),
  validate(updateClassSchema),
  updateClass
);
router.delete('/:id', requireRole(['admin', 'staff']), validateUUID(['id']), deleteClass);
router.delete(
  '/:id/students/:studentId',
  requireRole(['admin', 'staff']),
  validateUUID(['id', 'studentId']),
  unenrollStudent
);

export default router;
