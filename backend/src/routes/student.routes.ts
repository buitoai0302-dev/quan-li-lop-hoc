import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImport,
} from '../controllers/student.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const studentBodySchema = z.object({
  full_name: z.string().min(1, 'Họ và tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional().nullable(),
  parent_phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
});
const createStudentSchema = z.object({ body: studentBodySchema });

const updateStudentSchema = z.object({
  body: studentBodySchema.omit({ email: true }).partial().extend({
    is_active: z.boolean().optional(),
  }),
});

const bulkImportSchema = z.object({
  body: z.object({
    branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
    students: z
      .array(
        z.object({
          full_name: z.string().min(1),
          email: z.string().email().optional().nullable(),
          phone: z.string().optional().nullable(),
          class_name: z.string().optional().nullable(),
        })
      )
      .min(1, 'Danh sách học sinh không được trống'),
  }),
});
import { enforceLimit } from '../middlewares/feature.middleware';

const router = Router();

router.get('/', requireRole(ACCESS.ADMIN_STAFF_TEACHER), getStudents);
router.post(
  '/',
  requireRole(ACCESS.ADMIN_STAFF),
  enforceLimit(
    'max_students',
    'SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND is_deleted = false'
  ),
  validate(createStudentSchema),
  createStudent
);
router.post('/bulk', requireRole(ACCESS.ADMIN_STAFF), validate(bulkImportSchema), bulkImport);
router.put(
  '/:id',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id']),
  validate(updateStudentSchema),
  updateStudent
);
router.delete('/:id', requireRole(ACCESS.ADMIN_STAFF), validateUUID(['id']), deleteStudent);

export default router;
