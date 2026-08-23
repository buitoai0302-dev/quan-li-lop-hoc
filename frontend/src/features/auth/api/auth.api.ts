import api from '@/api';
import type { User } from '@/types';

// Helper để unwrap data trả về từ backend nếu backend bọc trong { success: true, data: ... }
import type { AxiosResponse } from 'axios';

const unwrap = <T>(res: AxiosResponse<T> | any) =>
  res.data && res.data.data !== undefined ? res.data.data : res.data;

export const login = (data: Record<string, unknown>) => api.post('/auth/login', data).then(unwrap);
export const register = async (data: Record<string, unknown>) => {
  const res = await api.post('/auth/register', data);
  return unwrap(res);
};

export const resendVerification = async (email: string) => {
  const res = await api.post('/auth/resend-verification', { email });
  return unwrap(res);
};

export const verifyEmail = async (token: string) => {
  const res = await api.get(`/auth/verify-email?token=${token}`);
  return unwrap(res);
};

export const forgotPassword = async (email: string) => {
  const res = await api.post('/auth/forgot-password', { email });
  return unwrap(res);
};

export const resetPassword = async (data: Record<string, unknown>) => {
  const res = await api.post('/auth/reset-password', data);
  return unwrap(res);
};

export const completeOnboarding = async () => {
  const res = await api.post('/auth/onboarding/complete');
  return unwrap(res);
};

export const getCurrentUser = () => api.get<User>('/auth/me').then(unwrap);
export const updateProfile = (data: Record<string, unknown>) =>
  api.put<User>('/auth/me', data).then(unwrap);
export const logout = () => api.post('/auth/logout');
export const googleLogin = (credential: string) =>
  api.post('/auth/google', { credential }).then(unwrap);
