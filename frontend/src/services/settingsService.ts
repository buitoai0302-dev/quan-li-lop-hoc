import api from '@/api';
import type { Tenant } from '@/types';

export const getTenant = () => api.get<Tenant>('/tenant').then((res) => res.data);
export const updateTenant = (data: any) => api.put<Tenant>('/tenant', data).then((res) => res.data);

export const getApiKeyInfo = () =>
  api.get<{ hasAccess: boolean; apiKey?: string }>('/tenant/api-key').then((res) => res.data);
export const generateApiKey = () =>
  api.post<{ apiKey: string }>('/tenant/api-key').then((res) => res.data);

export const getGoogleAuthUrl = () =>
  api.get<{ url: string }>('/google/url').then((res) => res.data);
export const disconnectGoogle = () => api.delete('/google/disconnect');
export const syncAllGoogle = () =>
  api.post<{ message: string }>('/google/sync-all').then((res) => res.data);
