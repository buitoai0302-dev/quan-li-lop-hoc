import { z } from 'zod';

// Base ID schema
export const IdSchema = z.string().uuid();

// Branch Schema
export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Teacher Schema
export const TeacherSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  branch_id: z.string().optional(),
  branch_name: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Student Schema
export const StudentSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  branch_id: z.string().optional(),
  branch_name: z.string().optional(),
  is_active: z.boolean().optional(),
  parent_phone: z.string().optional(),
});

// Class Schema
export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  max_capacity: z.number(),
  branch_id: z.string(),
  branch_name: z.string().optional(),
  teacher_id: z.string(),
  teacher_name: z.string().optional(),
  subject_id: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.string(),
  created_at: z.string().optional(),
});

// Session Schema
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
  notes: z.string().optional(),
  class_name: z.string().optional(),
  teacher_name: z.string().optional(),
  room_name: z.string().optional(),
  branch_name: z.string().optional(),
});

// Attendance Record Schema
export const AttendanceRecordSchema = z.object({
  student_id: z.string(),
  full_name: z.string(),
  email: z.string().optional(),
  attendance_id: z.string().nullable(),
  status: z.string(),
  marked_at: z.string().nullable(),
});

// Type inferences
export type BranchType = z.infer<typeof BranchSchema>;
export type TeacherType = z.infer<typeof TeacherSchema>;
export type StudentType = z.infer<typeof StudentSchema>;
export type ClassType = z.infer<typeof ClassSchema>;
export type SessionType = z.infer<typeof SessionSchema>;
export type AttendanceRecordType = z.infer<typeof AttendanceRecordSchema>;
