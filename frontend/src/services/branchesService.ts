import api from '@/api';
import type { Branch } from '@/types';

export const getBranches = () => api.get<Branch[]>('/branches').then((res) => res.data);
export const createBranch = (data: any) => api.post('/branches', data);
export const updateBranch = (id: string, data: any) =>
  api.put(`/branches/${id}`, data).then((res) => res.data);

export const setupFirstBranch = (data: any) => api.put('/branches/first', data).then((res) => res.data);

export const deleteBranch = (id: string) => api.delete(`/branches/${id}`).then((res) => res.data);
