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
  requireRole(['admin', 'teacher', 'staff']),
  validateUUID(['sessionId']),
  getAttendanceBySession
);
router.post(
  '/session/:sessionId',
  requireRole(['admin', 'teacher', 'staff']),
  validateUUID(['sessionId']),
  validate(recordAttendanceSchema),
  recordAttendance
);

export default router;
