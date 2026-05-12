import api from '@/api';
import type { User } from '@/types';

export const login = (data: any) => api.post('/auth/login', data).then((res) => res.data);
export const register = (data: any) => api.post('/auth/register', data).then((res) => res.data);
export const getCurrentUser = () => api.get<User>('/auth/me').then((res) => res.data);
export const updateProfile = (data: any) => api.put<User>('/auth/me', data).then((res) => res.data);
export const logout = () => api.post('/auth/logout');
export const googleLogin = (credential: string) =>
  api.post('/auth/google', { credential }).then((res) => res.data);
