import api from '@/api';

export const bulkImportStudents = (data: Record<string, unknown>[], branchId: string) =>
  api.post('/students/bulk', { students: data, branch_id: branchId }).then((res) => res.data);

export const bulkImportOther = (type: string, data: Record<string, unknown>[]) =>
  api.post(`/import/${type}`, { data }).then((res) => res.data);
