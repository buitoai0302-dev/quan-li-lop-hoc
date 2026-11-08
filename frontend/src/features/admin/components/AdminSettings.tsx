import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Save,
  Settings,
  Phone,
  Mail,
  Building,
  MapPin,
  Hash,
  CheckCircle,
  Globe,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import { Card, Button, Input } from '@/components/common/UI';
import { useAdminSettings, useUpdateSettings } from '../hooks/useSystemSettings';
import type { SystemSettings } from '../api/system.api';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';
import { fillMissingLegalDrafts } from '../legalDrafts';

const AdminSettings: React.FC = () => {
  const { t } = useTranslation();
  const { data: settingsData, isLoading } = useAdminSettings();
  const { mutate: updateSettingsMutate, isPending: isSaving } = useUpdateSettings();

  const [formData, setFormData] = useState<SystemSettings>({});

  useEffect(() => {
    if (settingsData) {
      setFormData(fillMissingLegalDrafts(settingsData));
    }
  }, [settingsData]);

  const handleChange = (key: keyof SystemSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettingsMutate(formData, {
      onSuccess: () => {
        toast.success(t('common.success', 'Lưu thay đổi thành công'));
      },
      onError: (error: any) => handleApiError(error as AxiosError<ApiErrorData>, t),
    });
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Settings}
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 group"
          >
            <Save
              size={16}
              className="shrink-0 transition-transform duration-300 group-hover:scale-110"
            />
            <span className="hidden sm:inline">{t('admin.settings.save')}</span>
          </Button>
        }
      ></PageHeader>

      <div className="flex-1 overflow-auto custom-scrollbar px-1 py-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Info Card */}
            <Card className="h-full">
              <div className="p-5 sm:p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      {t('admin.settings.businessInfoTitle')}
                    </h3>
                    <p className="text-xs text-gray-500">{t('admin.settings.businessInfoDesc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="system-name"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.systemName')}
                    </label>
                    <Input
                      id="system-name"
                      value={formData.SYSTEM_NAME || ''}
                      onChange={(e) => handleChange('SYSTEM_NAME', e.target.value)}
                      placeholder="VD: EduSchedule"
                      icon={<Globe size={16} />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tax-code"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.taxCode')}
                    </label>
                    <Input
                      id="tax-code"
                      value={formData.TAX_CODE || ''}
                      onChange={(e) => handleChange('TAX_CODE', e.target.value)}
                      placeholder="VD: 0123456789"
                      icon={<Hash size={16} />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="postal-code"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.postalCode')}
                    </label>
                    <Input
                      id="postal-code"
                      value={formData.POSTAL_CODE || ''}
                      onChange={(e) => handleChange('POSTAL_CODE', e.target.value)}
                      placeholder="VD: 700000"
                      icon={<MapPin size={16} />}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Info Card */}
            <Card className="h-full">
              <div className="p-5 sm:p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      {t('admin.settings.contactInfoTitle')}
                    </h3>
                    <p className="text-xs text-gray-500">{t('admin.settings.contactInfoDesc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.hotline')}
                    </label>
                    <Input
                      id="contact-phone"
                      value={formData.CONTACT_PHONE || ''}
                      onChange={(e) => handleChange('CONTACT_PHONE', e.target.value)}
                      placeholder="VD: 0901234567"
                      icon={<Phone size={16} />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.email')}
                    </label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={formData.CONTACT_EMAIL || ''}
                      onChange={(e) => handleChange('CONTACT_EMAIL', e.target.value)}
                      placeholder="VD: contact@eduschedule.com"
                      icon={<Mail size={16} />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-zalo"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.zaloLink')}
                    </label>
                    <Input
                      id="contact-zalo"
                      value={formData.CONTACT_ZALO || ''}
                      onChange={(e) => handleChange('CONTACT_ZALO', e.target.value)}
                      placeholder="VD: https://zalo.me/0901234567"
                      icon={<Globe size={16} />}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">{t('admin.settings.zaloDesc')}</p>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-address"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.address')}
                    </label>
                    <Input
                      id="contact-address"
                      value={formData.CONTACT_ADDRESS || ''}
                      onChange={(e) => handleChange('CONTACT_ADDRESS', e.target.value)}
                      placeholder="VD: 123 ABC, Quận XYZ, TP.HCM"
                      icon={<MapPin size={16} />}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Info Card */}
            <Card className="h-full md:col-span-2">
              <div className="p-5 sm:p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      {t('admin.settings.paymentInfoTitle')}
                    </h3>
                    <p className="text-xs text-gray-500">{t('admin.settings.paymentInfoDesc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="bank-id"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.bankId')}
                    </label>
                    <Input
                      id="bank-id"
                      value={formData.PAYMENT_BANK_ID || ''}
                      onChange={(e) => handleChange('PAYMENT_BANK_ID', e.target.value)}
                      placeholder="VD: techcombank, vcb, 970415"
                      icon={<Hash size={16} />}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {t('admin.settings.bankIdDesc')}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="bank-name"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.bankName')}
                    </label>
                    <Input
                      id="bank-name"
                      value={formData.PAYMENT_BANK_NAME || ''}
                      onChange={(e) => handleChange('PAYMENT_BANK_NAME', e.target.value)}
                      placeholder="VD: Techcombank"
                      icon={<Building size={16} />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="account-number"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.accountNumber')}
                    </label>
                    <Input
                      id="account-number"
                      value={formData.PAYMENT_ACCOUNT_NUMBER || ''}
                      onChange={(e) => handleChange('PAYMENT_ACCOUNT_NUMBER', e.target.value)}
                      placeholder="VD: 1903 1234 567 890"
                      icon={<Hash size={16} />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="account-name"
                      className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      {t('admin.settings.accountName')}
                    </label>
                    <Input
                      id="account-name"
                      value={formData.PAYMENT_ACCOUNT_NAME || ''}
                      onChange={(e) => handleChange('PAYMENT_ACCOUNT_NAME', e.target.value)}
                      placeholder="VD: CONG TY TNHH EDU SCHEDULE"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {t('admin.settings.legalTitle')}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.settings.legalDesc')}
                </p>
                <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
                  {t('admin.settings.legalDraftNotice')}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="legal-entity"
                    className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {t('admin.settings.legalEntity')}
                  </label>
                  <Input
                    id="legal-entity"
                    value={formData.LEGAL_ENTITY_NAME || ''}
                    onChange={(e) => handleChange('LEGAL_ENTITY_NAME', e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label
                    htmlFor="legal-date"
                    className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {t('admin.settings.effectiveDate')}
                  </label>
                  <Input
                    id="legal-date"
                    type="date"
                    value={formData.LEGAL_EFFECTIVE_DATE || ''}
                    onChange={(e) => handleChange('LEGAL_EFFECTIVE_DATE', e.target.value)}
                  />
                </div>
              </div>
              {(
                [
                  'PRIVACY_POLICY_VI',
                  'PRIVACY_POLICY_EN',
                  'TERMS_OF_SERVICE_VI',
                  'TERMS_OF_SERVICE_EN',
                ] as const
              ).map((key) => (
                <div key={key}>
                  <label
                    htmlFor={key}
                    className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {t(`admin.settings.${key}`)}
                  </label>
                  <textarea
                    id={key}
                    rows={9}
                    maxLength={30000}
                    value={formData[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-900 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              ))}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <input
                  type="checkbox"
                  checked={formData.LEGAL_PUBLISHED === 'true'}
                  onChange={(e) =>
                    handleChange('LEGAL_PUBLISHED', e.target.checked ? 'true' : 'false')
                  }
                  className="mt-1 h-5 w-5"
                />
                <span>{t('admin.settings.publishLegal')}</span>
              </label>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('admin.settings.legalWarning')}
              </p>
            </div>
          </Card>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-start gap-3 border border-emerald-100 dark:border-emerald-800/50">
            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                {t('admin.settings.autoSyncTitle')}
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                {t('admin.settings.autoSyncDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
