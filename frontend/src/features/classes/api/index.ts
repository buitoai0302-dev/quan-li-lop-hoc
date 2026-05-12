import api from '@/api';
import type { ClassData, Enrollment, RecurringSchedule } from '@/types';

export const getClasses = () => api.get<ClassData[]>('/classes').then((res) => res.data);

export const getClassSchedules = (classId: string) =>
  api.get<RecurringSchedule[]>(`/classes/${classId}/schedules`).then((res) => res.data);

export const getClassEnrollments = (classId: string) =>
  api.get<Enrollment[]>(`/classes/${classId}/enrollments`).then((res) => res.data);

export const createClass = (data: any) => api.post('/classes', data);
export const updateClass = (id: string, data: any) => api.put(`/classes/${id}`, data);
export const deleteClass = (id: string) => api.delete(`/classes/${id}`);

export const enrollStudent = (classId: string, studentId: string) =>
  api.post(`/classes/${classId}/enroll`, { student_id: studentId });

export const unenrollStudent = (classId: string, studentId: string) =>
  api.post(`/classes/${classId}/unenroll`, { student_id: studentId });

export const enrollBulk = (classId: string, studentIds: string[]) =>
  api.post(`/classes/${classId}/enroll-bulk`, { student_ids: studentIds });
