import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlans,
  getTenant,
  getPlanRequestStatus,
  requestPlanUpgrade,
  createPaymentUrl,
} from '../api/subscription.api';

export const useSubscriptionData = () => {
  return useQuery({
    queryKey: ['subscription-data'],
    queryFn: async () => {
      const [plansData, tenantData, requestsData] = await Promise.all([
        getPlans(),
        getTenant(),
        getPlanRequestStatus().catch(() => null),
      ]);
      return { plans: plansData, tenant: tenantData, requestStatus: requestsData };
    },
  });
};

export const useRequestPlanUpgrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => requestPlanUpgrade(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-data'] });
    },
  });
};

export const useCreatePaymentUrl = () => {
  return useMutation({
    mutationFn: (data: { plan_id: string; gateway: 'vnpay' | 'momo' | 'stripe' }) =>
      createPaymentUrl(data),
  });
};
