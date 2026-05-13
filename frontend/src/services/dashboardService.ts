import api from '@/api';

export const getDashboardStats = (period: string = '6months') =>
  api.get(`/dashboard/stats?period=${period}`).then((res) => res.data);
