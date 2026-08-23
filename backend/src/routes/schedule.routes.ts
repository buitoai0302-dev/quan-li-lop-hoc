import { Router } from 'express';
import {
  getWeeklySchedule,
  createSession,
  updateSession,
  deleteSession,
} from '../controllers/schedule.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { validateUUID, validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const createSessionSchema = z.object({
  body: z.object({
    classId: z.string().uuid('ID lớp học không hợp lệ'),
    roomId: z.string().uuid('ID phòng học không hợp lệ'),
    teacherId: z.string().uuid('ID giáo viên không hợp lệ'),
    sessionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng thời gian không hợp lệ (HH:mm)'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng thời gian không hợp lệ (HH:mm)'),
    sessionType: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updateSessionSchema = z.object({
  body: z.object({
    classId: z.string().uuid().optional(),
    roomId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    sessionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    sessionType: z.string().optional(),
    notes: z.string().optional(),
  }),
});

router.get('/weekly', requireRole(['admin', 'teacher', 'student', 'staff']), getWeeklySchedule);
router.post(
  '/sessions',
  requireRole(['admin', 'staff']),
  validate(createSessionSchema),
  createSession
);
router.put(
  '/sessions/:id',
  requireRole(['admin', 'staff']),
  validateUUID(['id']),
  validate(updateSessionSchema),
  updateSession
);
router.delete(
  '/sessions/:id',
  requireRole(['admin', 'staff']),
  validateUUID(['id']),
  deleteSession
);

export default router;
