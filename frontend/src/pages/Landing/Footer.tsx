import React from 'react';
import { Phone, Globe, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePublicSettings } from '@/features/admin/hooks/useSystemSettings';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { data: settings } = usePublicSettings();

  return (
    <footer className="bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Column 1: Basic Info & Support */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img
                src="/logo.png"
                alt="EduSchedule Logo"
                className="w-8 h-8 rounded-lg shadow-sm"
              />
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                EduSchedule
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
              {t(
                'landing.footerDesc',
                'Hệ điều hành hiện đại dành cho trung tâm giáo dục. Đơn giản hóa quá trình xếp lịch, điểm danh và quản lý.'
              )}
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white mb-4">
              {t('landing.support', 'Hỗ trợ')}
            </h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <a
                  href={
                    settings?.CONTACT_ZALO
                      ? settings.CONTACT_ZALO.startsWith('http')
                        ? settings.CONTACT_ZALO
                        : `https://zalo.me/${settings.CONTACT_ZALO.replace(/[^0-9]/g, '')}`
                      : '#'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary transition-colors"
                  onClick={(e) => {
                    if (!settings?.CONTACT_ZALO) {
                      e.preventDefault();
                    }
                  }}
                >
                  {t('landing.zaloSupport', 'Hỗ trợ qua Zalo')}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Contact */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">
              {t('landing.contactUs', 'Liên hệ')}
            </h4>
            <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <span>{settings?.CONTACT_ADDRESS || t('landing.address', 'Hà Nội, Việt Nam')}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400 shrink-0" />
                <span>Hotline: {settings?.CONTACT_PHONE || '1900 xxxx'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400 shrink-0" />
                <span>Email: {settings?.CONTACT_EMAIL || 'contact@eduschedule.com'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} EduSchedule.{' '}
            {t('landing.allRightsReserved', 'Đã đăng ký bản quyền.')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
