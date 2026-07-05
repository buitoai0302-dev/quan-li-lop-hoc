import api from '@/api';
import type { User } from '@/types';

export const login = (data: Record<string, unknown>) => api.post('/auth/login', data).then((res) => res.data);
export const register = async (data: Record<string, unknown>) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};

export const resendVerification = async (email: string) => {
  const res = await api.post('/auth/resend-verification', { email });
  return res.data;
};

export const verifyEmail = async (token: string) => {
  const res = await api.get(`/auth/verify-email?token=${token}`);
  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (data: Record<string, unknown>) => {
  const res = await api.post('/auth/reset-password', data);
  return res.data;
};

export const completeOnboarding = async () => {
  const res = await api.post('/auth/onboarding/complete');
  return res.data;
};

export const getCurrentUser = () => api.get<User>('/auth/me').then((res) => res.data);
export const updateProfile = (data: Record<string, unknown>) => api.put<User>('/auth/me', data).then((res) => res.data);
export const logout = () => api.post('/auth/logout');
export const googleLogin = (credential: string) =>
  api.post('/auth/google', { credential }).then((res) => res.data);
