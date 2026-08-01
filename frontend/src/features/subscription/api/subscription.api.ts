import api from '@/api';
import type { Plan, Tenant } from '@/types';

export const getPlans = () => api.get<Plan[]>('/plans').then((res) => res.data);
export const getTenant = () => api.get<Tenant>('/tenant').then((res) => res.data);
export const getPlanRequestStatus = () => api.get('/plans/request/status').then((res) => res.data);
export const requestPlanUpgrade = (planId: string) => api.post('/plans/request', { planId });
