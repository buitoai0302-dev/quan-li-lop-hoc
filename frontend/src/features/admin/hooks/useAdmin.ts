import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminTenants,
  getAdminPlans,
  getAdminStats,
  updateTenant,
  updatePlan,
  getPlanRequests,
  approvePlanRequest,
  rejectPlanRequest,
  getActivities,
  getAdminUsers,
  createAdminUser,
  resetAdminUserPassword,
  toggleAdminUserStatus,
} from '../api/admin.api';
import type { UpdatePlanPayload } from '../api/admin.api';
import type { Tenant } from '@/types';

export const useAdminTenants = () => {
  return useQuery({
    queryKey: ['admin-tenants'],
    queryFn: getAdminTenants,
  });
};

export const useAdminPlans = () => {
  return useQuery({
    queryKey: ['admin-plans'],
    queryFn: getAdminPlans,
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });
};

export const usePlanRequests = () => {
  return useQuery({
    queryKey: ['admin-plan-requests'],
    queryFn: getPlanRequests,
  });
};

export const useActivities = (page: number, limit: number = 20) => {
  return useQuery({
    queryKey: ['admin-activities', page, limit],
    queryFn: () => getActivities(page, limit),
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tenant> }) => updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanPayload }) => updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
  });
};

export const useApprovePlanRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvePlanRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plan-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });
};

export const useRejectPlanRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectPlanRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plan-requests'] });
    },
  });
};

export const useAdminUsers = (params?: { search?: string; role?: string; tenant_id?: string }) => {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => getAdminUsers(params),
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });
};

export const useResetAdminUserPassword = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      resetAdminUserPassword(id, data),
  });
};

export const useToggleAdminUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleAdminUserStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};
