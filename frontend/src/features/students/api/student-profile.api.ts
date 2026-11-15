import { z } from 'zod';
import api from '@/api';

export const PROFILE_TABS = ['classes', 'attendance', 'tuition', 'payments'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
export const isProfileTab = (value: unknown): value is ProfileTab =>
  PROFILE_TABS.some((tab) => tab === value);
const StudentProfileSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  parent_phone: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  is_active: z.boolean(),
  branch_name: z.string().nullable(),
  class_count: z.number(),
  attendance_count: z.number(),
  outstanding_vnd: z.string(),
  paid_vnd: z.string(),
});
const HistorySchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      date: z.string(),
      status: z.string().optional(),
      end_date: z.string().optional(),
      teacher_name: z.string().nullable().optional(),
      branch_name: z.string().nullable().optional(),
      session_id: z.string().optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      amount_vnd: z.string().optional(),
      payment_method: z.string().optional(),
      reference_code: z.string().nullable().optional(),
      tuition_id: z.string().optional(),
    })
  ),
});
export const studentProfileApi = {
  get: (studentId: string, signal?: AbortSignal) =>
    api
      .get(`/students/${studentId}/profile`, { signal })
      .then((response) => StudentProfileSchema.parse(response.data)),
  history: (
    studentId: string,
    type: Exclude<ProfileTab, 'tuition'>,
    limit: number,
    offset: number,
    signal?: AbortSignal
  ) =>
    api
      .get(`/students/${studentId}/history`, { params: { type, limit, offset }, signal })
      .then((response) => HistorySchema.parse(response.data)),
};
