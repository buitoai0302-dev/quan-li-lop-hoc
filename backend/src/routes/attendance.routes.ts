import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import {
  getAttendanceBySession,
  getAttendanceHistory,
  recordAttendance,
} from '../controllers/attendance.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const recordAttendanceSchema = z.object({
  body: z.object({
    records: z
      .array(
        z.object({
          student_id: z.string().uuid('ID học sinh không hợp lệ'),
          status: z.enum(['present', 'absent', 'late', 'excused']),
        })
      )
      .min(1, 'Danh sách điểm danh không được trống')
      .max(1000),
    expectedVersion: z.number().int().min(0).optional(),
    reason: z.string().trim().max(1000).optional(),
    confirmedStudentIds: z.array(z.string().uuid()).max(1000).optional(),
  }),
});

router.get(
  '/session/:sessionId/history',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['sessionId']),
  validate(
    z.object({ query: z.object({ offset: z.coerce.number().int().min(0).max(100000).optional() }) })
  ),
  getAttendanceHistory
);

router.get(
  '/session/:sessionId',
  requireRole(ACCESS.ADMIN_STAFF_TEACHER),
  validateUUID(['sessionId']),
  getAttendanceBySession
);
router.post(
  '/session/:sessionId',
  requireRole(ACCESS.ADMIN_STAFF_TEACHER),
  validateUUID(['sessionId']),
  validate(recordAttendanceSchema),
  recordAttendance
);

export default router;
