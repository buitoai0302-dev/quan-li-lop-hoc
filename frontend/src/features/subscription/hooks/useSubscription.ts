import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlans,
  getTenant,
  getPlanRequestStatus,
  requestPlanUpgrade,
  createPaymentUrl,
} from '../api/subscription.api';
import { QUERY_KEYS, PAYMENT_METHODS } from '@/utils/constants';

export const useSubscriptionData = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.SUBSCRIPTION_DATA],
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
    mutationFn: (data: { planId: string; billingCycle: string; notes?: string }) =>
      requestPlanUpgrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUBSCRIPTION_DATA] });
    },
  });
};

export const useCreatePaymentUrl = () => {
  return useMutation({
    mutationFn: (data: {
      plan_id: string;
      gateway:
        | typeof PAYMENT_METHODS.VNPAY
        | typeof PAYMENT_METHODS.MOMO
        | typeof PAYMENT_METHODS.STRIPE;
    }) => createPaymentUrl(data),
  });
};
