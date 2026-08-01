import api from '@/api';
import { BranchSchema, safeParseArray } from '@/types/schemas';
import type { BranchFormData } from '@/types/schemas';

export const getBranches = () =>
  api.get<unknown>('/branches').then((res) => safeParseArray(BranchSchema, res.data, 'getBranches'));

export const createBranch = (data: BranchFormData) => api.post('/branches', data);

export const updateBranch = (id: string, data: BranchFormData) =>
  api.put(`/branches/${id}`, data).then((res) => res.data);

export const setupFirstBranch = (data: BranchFormData) =>
  api.put('/branches/first', data).then((res) => res.data);

export const deleteBranch = (id: string) =>
  api.delete(`/branches/${id}`).then((res) => res.data);
