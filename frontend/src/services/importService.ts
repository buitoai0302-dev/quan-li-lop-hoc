import api from '@/api';

export const bulkImportStudents = (data: any[], branchId: string) =>
  api.post('/students/bulk', { students: data, branch_id: branchId }).then((res) => res.data);

export const bulkImportOther = (type: string, data: any[]) =>
  api.post(`/import/${type}`, { data }).then((res) => res.data);
