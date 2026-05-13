import api from '@/api';

export const getWeeklySchedule = (
  startDate: string,
  endDate: string,
  branchId?: string,
  teacherId?: string,
  classId?: string
) => {
  let url = `/schedule/weekly?startDate=${startDate}&endDate=${endDate}`;
  if (branchId) url += `&branchId=${branchId}`;
  if (teacherId) url += `&teacherId=${teacherId}`;
  if (classId) url += `&classId=${classId}`;
  return api.get(url).then((res) => res.data.data);
};

export const createSession = (data: any) => api.post('/schedule/sessions', data).then((res) => res.data);

export const updateSession = (id: string, data: any) =>
  api.put(`/schedule/sessions/${id}`, data).then((res) => res.data);

export const deleteSession = (id: string) =>
  api.delete(`/schedule/sessions/${id}`).then((res) => res.data);
