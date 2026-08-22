import api from '@/api';

export type SystemSettings = {
  SYSTEM_NAME?: string;
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
  CONTACT_ZALO?: string;
  CONTACT_ADDRESS?: string;
  TAX_CODE?: string;
  POSTAL_CODE?: string;
  PAYMENT_BANK_ID?: string;
  PAYMENT_BANK_NAME?: string;
  PAYMENT_ACCOUNT_NUMBER?: string;
  PAYMENT_ACCOUNT_NAME?: string;
  [key: string]: string | undefined;
};

export const getPublicSettings = () =>
  api.get<SystemSettings>('/system/settings/public').then((res) => res.data);

export const getAdminSettings = () =>
  api.get<SystemSettings>('/system/settings').then((res) => res.data);

export const updateSettings = (data: Partial<SystemSettings>) =>
  api.put('/system/settings', data).then((res) => res.data);
