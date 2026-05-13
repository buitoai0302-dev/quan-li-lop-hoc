import api from '@/api';
import type { Student } from '@/types';

export const getStudents = (branchId?: string) => {
  const url = branchId ? `/students?branch_id=${branchId}` : '/students';
  return api.get<Student[]>(url).then((res) => res.data);
};

export const createStudent = (data: any) => api.post('/students', data);
export const updateStudent = (id: string, data: any) => api.put(`/students/${id}`, data);
export const deleteStudent = (id: string) => api.delete(`/students/${id}`);
