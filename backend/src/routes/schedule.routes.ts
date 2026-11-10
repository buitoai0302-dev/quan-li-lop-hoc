import { ACCESS } from '../utils/permissions';
import { MAX_BATCH_SESSIONS } from '../utils/constants';
import { Router } from 'express';
import {
  getWeeklySchedule,
  createSession,
  createSessions,
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

const createSessionsSchema = z.object({
  body: z.object({
    sessions: z
      .array(
        createSessionSchema.shape.body.refine(({ sessionDate, startTime, endTime }) => {
          const date = new Date(`${sessionDate}T00:00:00Z`);
          const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
          return (
            Number.isFinite(date.valueOf()) &&
            date.toISOString().slice(0, 10) === sessionDate &&
            timePattern.test(startTime) &&
            timePattern.test(endTime) &&
            endTime > startTime
          );
        })
      )
      .min(1)
      .max(MAX_BATCH_SESSIONS),
  }),
});

router.get('/weekly', requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT_API), getWeeklySchedule);
router.post(
  '/sessions',
  requireRole(ACCESS.ADMIN_STAFF),
  validate(createSessionSchema),
  createSession
);
router.post(
  '/sessions/bulk',
  requireRole(ACCESS.ADMIN_STAFF),
  validate(createSessionsSchema),
  createSessions
);
router.put(
  '/sessions/:id',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id']),
  validate(updateSessionSchema),
  updateSession
);
router.delete(
  '/sessions/:id',
  requireRole(ACCESS.ADMIN_STAFF),
  validateUUID(['id']),
  deleteSession
);

export default router;
