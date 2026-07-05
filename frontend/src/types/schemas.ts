import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------
const optionalString = z.string().optional();
const optionalBool = z.boolean().optional();

// ---------------------------------------------------------------------------
// Domain Schemas (API Response Shapes)
// ---------------------------------------------------------------------------

export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: optionalString,
  phone: optionalString,
  is_active: optionalBool,
});

export const TeacherSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  phone: optionalString,
  specialization: optionalString,
  branch_id: optionalString,
  branch_name: optionalString,
  is_active: optionalBool,
});

export const StudentSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  phone: optionalString,
  date_of_birth: optionalString,
  branch_id: optionalString,
  branch_name: optionalString,
  is_active: optionalBool,
  parent_phone: optionalString,
});

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().optional(),
  room_type: optionalString,
  branch_id: optionalString,
  branch_name: optionalString,
  is_active: optionalBool,
});

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  max_capacity: z.number(),
  branch_id: z.string(),
  branch_name: optionalString,
  teacher_id: z.string(),
  teacher_name: optionalString,
  subject_id: optionalString,
  start_date: z.string(),
  end_date: z.string(),
  status: z.string(),
  created_at: optionalString,
});

export const SessionSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  class_id: z.string(),
  room_id: z.string(),
  teacher_id: z.string(),
  session_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  session_type: z.string(),
  status: z.string(),
  notes: optionalString,
  class_name: optionalString,
  teacher_name: optionalString,
  room_name: optionalString,
  branch_name: optionalString,
});

export const EnrollmentSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: optionalString,
  enrolled_at: z.string(),
});

export const AttendanceRecordSchema = z.object({
  student_id: z.string(),
  full_name: z.string(),
  email: optionalString,
  attendance_id: z.string().nullable(),
  status: z.string(),
  marked_at: z.string().nullable(),
});

export const RecurringScheduleSchema = z.object({
  day_of_week: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  room_id: z.string(),
  notes: optionalString,
});

// ---------------------------------------------------------------------------
// Form Data Schemas (for React Hook Form + Zod validation)
// ---------------------------------------------------------------------------

export const StudentFormSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: optionalString,
  date_of_birth: optionalString,
  branch_id: z.string().min(1),
  is_active: z.boolean(),
  parent_phone: optionalString,
});

export const TeacherFormSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: optionalString,
  specialization: optionalString,
  branch_id: z.string().min(1),
  is_active: z.boolean(),
});

export const BranchFormSchema = z.object({
  name: z.string().min(1),
  address: optionalString,
  phone: optionalString,
  is_active: z.boolean(),
});

export const RoomFormSchema = z.object({
  name: z.string().min(1),
  capacity: z.number(),
  room_type: z.string(),
  branch_id: z.string().min(1),
  is_active: z.boolean(),
});

export const ClassBasicFormSchema = z.object({
  name: z.string().min(1),
  branch_id: z.string().min(1),
  teacher_id: optionalString,
  max_capacity: z.number().optional(),
  start_date: optionalString,
  end_date: optionalString,
});

export const SessionFormSchema = z.object({
  classId: z.string().min(1),
  roomId: z.string().min(1),
  teacherId: z.string().min(1),
  sessionDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Inferred Types (single source of truth)
// ---------------------------------------------------------------------------

export type Branch = z.infer<typeof BranchSchema>;
export type Teacher = z.infer<typeof TeacherSchema>;
export type Student = z.infer<typeof StudentSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type ClassData = z.infer<typeof ClassSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Enrollment = z.infer<typeof EnrollmentSchema>;
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;
export type RecurringSchedule = z.infer<typeof RecurringScheduleSchema>;

export type StudentFormData = z.infer<typeof StudentFormSchema>;
export type TeacherFormData = z.infer<typeof TeacherFormSchema>;
export type BranchFormData = z.infer<typeof BranchFormSchema>;
export type RoomFormData = z.infer<typeof RoomFormSchema>;
export type ClassBasicFormData = z.infer<typeof ClassBasicFormSchema>;
export type SessionFormData = z.infer<typeof SessionFormSchema>;

// ---------------------------------------------------------------------------
// Safe parse helper — logs warnings, returns fallback on failure
// ---------------------------------------------------------------------------

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] Parse error${context ? ` (${context})` : ''}:`, result.error.flatten());
    // Return data as-is and cast — avoids crashing UI while surfacing the error
    return data as T;
  }
  return result.data;
}

export function safeParseArray<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T[] {
  if (!Array.isArray(data)) {
    console.error(`[Zod] Expected array${context ? ` (${context})` : ''}:`, data);
    return [];
  }
  return data.map((item) => safeParse(schema, item, context));
}
