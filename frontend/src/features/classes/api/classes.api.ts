import api from '@/api';
import { ClassSchema, EnrollmentSchema, RecurringScheduleSchema, safeParseArray } from '@/types/schemas';
import type { ClassBasicFormData } from '@/types/schemas';

export const getClasses = () =>
  api.get<unknown>('/classes').then((res) => safeParseArray(ClassSchema, res.data, 'getClasses'));

export const getClassSchedules = (classId: string) =>
  api
    .get<unknown>(`/classes/${classId}/recurring`)
    .then((res) => safeParseArray(RecurringScheduleSchema, res.data, 'getClassSchedules'));

export const getClassEnrollments = (classId: string) =>
  api
    .get<unknown>(`/classes/${classId}/students`)
    .then((res) => safeParseArray(EnrollmentSchema, res.data, 'getClassEnrollments'));

export const createClass = (data: ClassBasicFormData) => api.post('/classes', data);
export const updateClass = (id: string, data: ClassBasicFormData) => api.put(`/classes/${id}`, data);
export const deleteClass = (id: string) => api.delete(`/classes/${id}`);

export const enrollStudent = (classId: string, studentId: string) =>
  api.post(`/classes/${classId}/students`, { student_id: studentId });

export const unenrollStudent = (classId: string, studentId: string) =>
  api.delete(`/classes/${classId}/students/${studentId}`);

export const enrollBulk = (classId: string, studentIds: string[]) =>
  api.post(`/classes/${classId}/students`, { student_ids: studentIds });
