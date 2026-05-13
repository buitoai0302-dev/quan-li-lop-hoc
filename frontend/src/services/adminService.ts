import api from '@/api';
import type { Tenant, AdminStats, Plan, PlanRequest, ActivityItem } from '@/types';

export const getAdminTenants = () => api.get<Tenant[]>('/admin/tenants').then((res) => res.data);
export const getAdminPlans = () => api.get<Plan[]>('/admin/plans').then((res) => res.data);
export const getAdminStats = () => api.get<AdminStats>('/admin/stats').then((res) => res.data);

export const updateTenant = (id: string, data: any) => api.patch(`/admin/tenants/${id}`, data);
export const updatePlan = (id: string, data: any) => api.put(`/admin/plans/${id}`, data);

export const getPlanRequests = () =>
  api.get<PlanRequest[]>('/plans/requests').then((res) => res.data);
export const approvePlanRequest = (id: string) => api.post(`/plans/requests/${id}/approve`);
export const rejectPlanRequest = (id: string) => api.post(`/plans/requests/${id}/reject`);

export const getActivities = (page: number, limit: number = 20) =>
  api
    .get<{
      activities: ActivityItem[];
      pagination: any;
    }>(`/dashboard/activities?page=${page}&limit=${limit}`)
    .then((res) => res.data);
