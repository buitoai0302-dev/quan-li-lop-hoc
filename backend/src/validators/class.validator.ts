import { z } from 'zod';
import { ERROR_CODES } from '../utils/constants';

// Request budgets, independent of the total enrollment capacity of a class.
export const MAX_RECURRING_SCHEDULES = 56;
export const MAX_ENROLLMENTS_PER_REQUEST = 1_000;

const recurringScheduleSchema = z.object({
  day_of_week: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  room_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const enrollmentIdsSchema = z
  .array(z.string().uuid())
  .max(MAX_ENROLLMENTS_PER_REQUEST, ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED);

const classBodySchema = z.object({
  branch_id: z.string().uuid('ID chi nhánh không hợp lệ'),
  subject_id: z.string().uuid().optional().nullable(),
  teacher_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Tên lớp không được để trống'),
  max_capacity: z.number().int().positive().optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  recurring_schedules: z
    .array(recurringScheduleSchema)
    .max(MAX_RECURRING_SCHEDULES, ERROR_CODES.CLASS_RECURRING_LIMIT_EXCEEDED)
    .optional(),
  enrollments: enrollmentIdsSchema.optional(),
});

export const createClassSchema = z.object({ body: classBodySchema });

export const updateClassSchema = z.object({
  body: classBodySchema
    .partial()
    .extend({
      status: z.string().optional(),
      enrollment_changes: z
        .object({ add: enrollmentIdsSchema, remove: enrollmentIdsSchema })
        .optional(),
    })
    .refine(({ enrollments, enrollment_changes: changes }) => !enrollments || !changes)
    .refine(({ enrollment_changes: changes }) => {
      if (!changes) return true;
      const added = new Set(changes.add.map((id) => id.toLowerCase()));
      return changes.remove.every((id) => !added.has(id.toLowerCase()));
    }),
});

export const enrollStudentSchema = z.object({
  body: z
    .object({
      student_id: z.string().uuid().optional(),
      student_ids: enrollmentIdsSchema.optional(),
    })
    .refine((data) => data.student_id || (data.student_ids && data.student_ids.length > 0), {
      message: 'Vui lòng cung cấp ít nhất một học sinh (student_id hoặc student_ids)',
    }),
});
