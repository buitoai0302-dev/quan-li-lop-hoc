import api from '@/api';
import { StudentSchema, safeParseArray } from '@/types/schemas';
import type { StudentFormData } from '@/types/schemas';

export const getStudents = (branchId?: string) => {
  const url = branchId ? `/students?branch_id=${branchId}` : '/students';
  return api.get<unknown>(url).then((res) => safeParseArray(StudentSchema, res.data, 'getStudents'));
};

export const createStudent = (data: StudentFormData) => api.post('/students', data);
export const updateStudent = (id: string, data: StudentFormData) => api.put(`/students/${id}`, data);
export const deleteStudent = (id: string) => api.delete(`/students/${id}`);
