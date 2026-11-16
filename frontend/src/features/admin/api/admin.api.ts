import api from '@/api';
import type { Tenant, AdminStats, Plan, PlanRequest } from '@/types';
import type { ActivityItem } from '@/features/dashboard';

export const getAdminTenants = () => api.get<Tenant[]>('/admin/tenants').then((res) => res.data);
export const getAdminStats = () => api.get<AdminStats>('/admin/stats').then((res) => res.data);

export const updateTenant = (id: string, data: Partial<Tenant>) =>
  api.patch(`/admin/tenants/${id}`, data);

export type AdminPlan = Omit<
  Plan,
  'yearly_price_vnd' | 'yearly_price_usd' | 'limits' | 'features'
> & {
  yearly_price_vnd?: number;
  yearly_price_usd?: number;
  limits: Record<string, number>;
  features: Record<string, boolean>;
};

type AdminPlanResponse = Omit<
  AdminPlan,
  'price_vnd' | 'price_usd' | 'yearly_price_vnd' | 'yearly_price_usd'
> & {
  price_vnd: string | number;
  price_usd: string | number;
  yearly_price_vnd?: string | number;
  yearly_price_usd?: string | number;
};

export interface UpdatePlanPayload {
  name?: string;
  priceVnd?: number;
  priceUsd?: number;
  yearlyPriceVnd?: number;
  yearlyPriceUsd?: number;
  isActive?: boolean;
  limits?: Record<string, number>;
  features?: Record<string, boolean>;
}

export const getAdminPlans = async (): Promise<AdminPlan[]> => {
  const { data } = await api.get<AdminPlanResponse[]>('/admin/plans');
  return data.map((plan) => ({
    ...plan,
    price_vnd: Number(plan.price_vnd),
    price_usd: Number(plan.price_usd),
    yearly_price_vnd:
      plan.yearly_price_vnd === undefined ? undefined : Number(plan.yearly_price_vnd),
    yearly_price_usd:
      plan.yearly_price_usd === undefined ? undefined : Number(plan.yearly_price_usd),
  }));
};

export const updatePlan = (id: string, data: UpdatePlanPayload) =>
  api.put(`/admin/plans/${id}`, data);

export const getPlanRequests = () =>
  api.get<PlanRequest[]>('/plans/requests').then((res) => res.data);
export const approvePlanRequest = (id: string) => api.post(`/plans/requests/${id}/approve`);
export const rejectPlanRequest = (id: string) => api.post(`/plans/requests/${id}/reject`);

export const getActivities = (page: number, limit: number = 20) =>
  api
    .get<{
      activities: ActivityItem[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/dashboard/activities?page=${page}&limit=${limit}`)
    .then((res) => res.data);

// ─── User Management ────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  tenant_id: string;
  tenant_name: string;
}

export const getAdminUsers = (params?: { search?: string; role?: string; tenant_id?: string }) =>
  api.get<AdminUser[]>('/admin/users', { params }).then((res) => res.data);

export const createAdminUser = (data: Record<string, unknown>) =>
  api.post('/admin/users', data).then((res) => res.data);

export const resetAdminUserPassword = (id: string, data: Record<string, unknown>) =>
  api.post(`/admin/users/${id}/reset-password`, data).then((res) => res.data);

export const toggleAdminUserStatus = (id: string) =>
  api.patch(`/admin/users/${id}/status`).then((res) => res.data);

export const importAdminUsers = (tenant_id: string, data: Record<string, unknown>[]) =>
  api.post('/admin/users/import', { tenant_id, data }).then((res) => res.data);
