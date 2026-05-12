import api from '@/api';

export const getWeeklySchedule = (startDate: string, endDate: string) =>
  api.get(`/schedule/weekly?startDate=${startDate}&endDate=${endDate}`).then((res) => res.data);
