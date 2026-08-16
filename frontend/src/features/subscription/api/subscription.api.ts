import api from '@/api';
import type { Plan, Tenant } from '@/types';

export const getPlans = () => api.get<Plan[]>('/plans').then((res) => res.data);
export const getTenant = () => api.get<Tenant>('/tenant').then((res) => res.data);
export const getPlanRequestStatus = () => api.get('/plans/request/status').then((res) => res.data);
export const requestPlanUpgrade = (planId: string) => api.post('/plans/request', { planId });

export interface CreatePaymentDto {
  plan_id: string;
  gateway: 'vnpay' | 'momo' | 'stripe';
}

export interface PaymentUrlResponse {
  paymentUrl: string;
  invoiceId: string;
  orderId: string;
}

export const createPaymentUrl = (data: CreatePaymentDto) =>
  api.post<PaymentUrlResponse>('/billing/create-payment-url', data).then((res) => res.data);
