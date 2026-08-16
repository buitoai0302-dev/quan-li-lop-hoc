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

const AdminSettings: React.FC = () => {
  const { t } = useTranslation();
  const { data: settingsData, isLoading } = useAdminSettings();
  const { mutate: updateSettingsMutate, isPending: isSaving } = useUpdateSettings();

  const [formData, setFormData] = useState<SystemSettings>({});

  useEffect(() => {
    if (settingsData) {
      setFormData(settingsData);
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
      onError: (error: any) => handleApiError(error, t),
    });
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Settings}
        actions={
          <Button onClick={handleSave} loading={isSaving} className="gap-2">
            <Save size={16} /> Lưu thay đổi
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
                      Thông tin doanh nghiệp
                    </h3>
                    <p className="text-xs text-gray-500">
                      Tên thương hiệu, mã số thuế và định danh
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Tên hệ thống
                    </label>
                    <Input
                      value={formData.SYSTEM_NAME || ''}
                      onChange={(e) => handleChange('SYSTEM_NAME', e.target.value)}
                      placeholder="VD: EduSchedule"
                      icon={<Globe size={16} />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Mã số thuế
                    </label>
                    <Input
                      value={formData.TAX_CODE || ''}
                      onChange={(e) => handleChange('TAX_CODE', e.target.value)}
                      placeholder="VD: 0123456789"
                      icon={<Hash size={16} />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Mã bưu chính (Postal Code)
                    </label>
                    <Input
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
                      Thông tin liên hệ
                    </h3>
                    <p className="text-xs text-gray-500">
                      Đường dây nóng, hỗ trợ kỹ thuật và kinh doanh
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Điện thoại Hotline
                    </label>
                    <Input
                      value={formData.CONTACT_PHONE || ''}
                      onChange={(e) => handleChange('CONTACT_PHONE', e.target.value)}
                      placeholder="VD: 0901234567"
                      icon={<Phone size={16} />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Email liên hệ
                    </label>
                    <Input
                      type="email"
                      value={formData.CONTACT_EMAIL || ''}
                      onChange={(e) => handleChange('CONTACT_EMAIL', e.target.value)}
                      placeholder="VD: contact@eduschedule.com"
                      icon={<Mail size={16} />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Link Zalo (Liên hệ kinh doanh)
                    </label>
                    <Input
                      value={formData.CONTACT_ZALO || ''}
                      onChange={(e) => handleChange('CONTACT_ZALO', e.target.value)}
                      placeholder="VD: https://zalo.me/0901234567"
                      icon={<Globe size={16} />}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Đường dẫn này sẽ được mở khi khách hàng bấm nút "Liên hệ kinh doanh" ở trang
                      Gói dịch vụ.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Địa chỉ
                    </label>
                    <Input
                      value={formData.CONTACT_ADDRESS || ''}
                      onChange={(e) => handleChange('CONTACT_ADDRESS', e.target.value)}
                      placeholder="VD: 123 ABC, Quận XYZ, TP.HCM"
                      icon={<MapPin size={16} />}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-start gap-3 border border-emerald-100 dark:border-emerald-800/50">
            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                Đồng bộ tự động
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Các thông tin cấu hình tại đây sẽ tự động cập nhật trên toàn hệ thống, bao gồm nút
                Liên hệ trên giao diện người dùng, footer, và các email thông báo tự động.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
