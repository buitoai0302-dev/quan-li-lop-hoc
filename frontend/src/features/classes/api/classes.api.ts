import api from '@/api';
import { z } from 'zod';
import {
  ClassSchema,
  EnrollmentSchema,
  RecurringScheduleSchema,
  safeParseArray,
} from '@/types/schemas';
import type { ClassBasicFormData } from '@/types/schemas';

type ClassPayload = Omit<ClassBasicFormData, 'teacher_id'> & {
  teacher_id?: string | null;
  recurring_schedules?: Array<
    Omit<z.infer<typeof RecurringScheduleSchema>, 'day_of_week' | 'room_id'> & {
      day_of_week: string;
      room_id: string | null;
    }
  >;
  enrollments?: string[];
};

export const getClasses = () =>
  api.get<unknown>('/classes').then((res) => safeParseArray(ClassSchema, res.data, 'getClasses'));

export const getClassSchedules = (classId: string) =>
  api
    .get<unknown>(`/classes/${classId}/recurring`)
    .then((res) => z.array(RecurringScheduleSchema).parse(res.data));

export const getClassEnrollments = (classId: string) =>
  api
    .get<unknown>(`/classes/${classId}/students`)
    .then((res) => safeParseArray(EnrollmentSchema, res.data, 'getClassEnrollments'));

export const createClass = (data: ClassPayload) => api.post('/classes', data);
export const updateClass = (id: string, data: ClassPayload) => api.put(`/classes/${id}`, data);
export const deleteClass = (id: string) => api.delete(`/classes/${id}`);

export const enrollStudent = (classId: string, studentId: string) =>
  api.post(`/classes/${classId}/students`, { student_id: studentId });

export const unenrollStudent = (classId: string, studentId: string) =>
  api.delete(`/classes/${classId}/students/${studentId}`);

export const enrollBulk = (classId: string, studentIds: string[]) =>
  api.post(`/classes/${classId}/students`, { student_ids: studentIds });
