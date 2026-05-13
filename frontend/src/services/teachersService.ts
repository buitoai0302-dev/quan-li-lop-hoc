import api from '@/api';
import type { Teacher } from '@/types';

export const getTeachers = (branchId?: string) => {
  const url = branchId ? `/teachers?branch_id=${branchId}` : '/teachers';
  return api.get<Teacher[]>(url).then((res) => res.data);
};

export const createTeacher = (data: any) => api.post('/teachers', data);
export const updateTeacher = (id: string, data: any) => api.put(`/teachers/${id}`, data);
export const deleteTeacher = (id: string) => api.delete(`/teachers/${id}`);
