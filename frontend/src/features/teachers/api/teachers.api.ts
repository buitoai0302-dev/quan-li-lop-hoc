import api from '@/api';
import { TeacherSchema, safeParseArray } from '@/types/schemas';
import type { TeacherFormData } from '@/types/schemas';

export const getTeachers = (branchId?: string) => {
  const url = branchId ? `/teachers?branch_id=${branchId}` : '/teachers';
  return api.get<unknown>(url).then((res) => safeParseArray(TeacherSchema, res.data, 'getTeachers'));
};

export const createTeacher = (data: TeacherFormData) => api.post('/teachers', data);
export const updateTeacher = (id: string, data: TeacherFormData) => api.put(`/teachers/${id}`, data);
export const deleteTeacher = (id: string) => api.delete(`/teachers/${id}`);
