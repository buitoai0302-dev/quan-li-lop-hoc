import { ACCESS } from '../utils/permissions';
import { Router } from 'express';
import { getAttendanceBySession, recordAttendance } from '../controllers/attendance.controller';
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
      .min(1, 'Danh sách điểm danh không được trống'),
  }),
});

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
