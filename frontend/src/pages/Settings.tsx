import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Key, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [centerName, setCenterName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [notifySessions, setNotifySessions] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiAccess, setHasApiAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => { } });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [tenantRes, userRes] = await Promise.all([
          api.get('/tenant'),
          api.get('/auth/me')
        ]);

        setCenterName(tenantRes.data.name || '');
        setContactEmail(tenantRes.data.contact_email || '');

        setFullName(userRes.data.full_name || '');
        setNotifySessions(userRes.data.notify_upcoming_sessions);
        setIsGoogleConnected(userRes.data.is_google_connected);

        // Fetch API Key if available
        try {
          const apiRes = await api.get('/tenant/api-key');
          setApiKey(apiRes.data.apiKey);
          setHasApiAccess(true);
        } catch (err: any) {
          if (err.response?.status === 403) {
            setHasApiAccess(false);
          }
        }
      } catch (error) {
        toast.error(t('common.error'));
      }
    };
    fetchSettings();
  }, [t]);

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.put('/tenant', { name: centerName, contact_email: contactEmail });
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.put('/auth/me', {
        full_name: fullName,
        notify_upcoming_sessions: notifySessions
      });
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await api.get('/auth/google/url');
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(t('settings.googleUrlError'));
    }
  };

  const handleDisconnectGoogle = () => {
    setConfirmModal({
      open: true,
      message: t('settings.disconnectConfirm'),
      onConfirm: async () => {
        try {
          await api.delete('/auth/google/disconnect');
          setIsGoogleConnected(false);
          toast.success(t('settings.disconnectSuccess'));
        } catch (error) {
          toast.error(t('settings.disconnectError'));
        }
      }
    });
  };

  const handleGenerateApiKey = () => {
    if (apiKey) {
      setConfirmModal({
        open: true,
        message: t('settings.generateKeyConfirm'),
        onConfirm: async () => {
          setGeneratingKey(true);
          try {
            const res = await api.post('/tenant/api-key');
            setApiKey(res.data.apiKey);
            toast.success(t('common.success'));
          } catch (error) {
            toast.error(t('common.error'));
          } finally {
            setGeneratingKey(false);
          }
        }
      });
    } else {
      // No existing key, generate directly
      (async () => {
        setGeneratingKey(true);
        try {
          const res = await api.post('/tenant/api-key');
          setApiKey(res.data.apiKey);
          toast.success(t('common.success'));
        } catch (error) {
          toast.error(t('common.error'));
        } finally {
          setGeneratingKey(false);
        }
      })();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied', 'Đã sao chép!'));
  };


  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto space-y-10">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">{t('settings.title')}</h2>

      {/* Cấu hình Trung tâm */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{t('settings.basicInfo')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.basicInfoDesc')}</p>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.centerName')}</label>
            <div className="mt-1">
              <input
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 border dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.contactEmail')}</label>
            <div className="mt-1">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 border dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveTenant} disabled={saving} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </section>

      {/* Cấu hình Cá nhân */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{t('settings.personalSettings')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.personalSettingsDesc')}</p>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.displayName')}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 border dark:bg-gray-700 dark:text-white" />
          </div>

          <div className="sm:col-span-6 flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.notifications')}</label>
              <p className="text-xs text-gray-500">{t('settings.notificationDesc')}</p>
            </div>
            <div
              onClick={() => setNotifySessions(!notifySessions)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notifySessions ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifySessions ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveUser} disabled={saving} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </section>

      {/* Kết nối Ứng dụng */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{t('settings.appConnection')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.appConnectionDesc')}</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Google Calendar</p>
              <p className="text-xs text-gray-500">{isGoogleConnected ? t('settings.googleCalendarConnected') : t('settings.googleCalendarNotConnected')}</p>
            </div>
          </div>
          <button 
            onClick={isGoogleConnected ? handleDisconnectGoogle : handleConnectGoogle}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isGoogleConnected ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'text-primary bg-primary/10 hover:bg-primary/20'}`}
          >
            {isGoogleConnected ? t('settings.disconnect') : t('settings.connect')}
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
              <img src="https://img.icons8.com/color/48/zalo.png" alt="Zalo" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Zalo Official Account</p>
              <p className="text-xs text-gray-500">{t('settings.zaloNotConnected', 'Chưa kết nối Zalo OA')}</p>
            </div>
          </div>
          <button 
            onClick={() => toast.success(t('settings.zaloComingSoon', 'Tính năng kết nối Zalo OA đang được phê duyệt bởi Zalo. Vui lòng thử lại sau.'))}
            className="px-4 py-2 rounded-md text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {t('settings.connect')}
          </button>
        </div>
      </section>

      {/* Quản lý API */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Key size={20} className="text-primary" /> {t('settings.apiTitle', 'Quản lý API Access')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('settings.apiDesc', 'Sử dụng API để kết nối EduSchedule với các ứng dụng của riêng bạn.')}
          </p>
        </div>

        {!hasApiAccess ? (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-[1.5rem] border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <ShieldCheck className="text-blue-500" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-blue-900 dark:text-blue-100 italic">{t('settings.apiUpgradeTitle')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {t('settings.apiUpgradeDesc')}
                </p>
                <button 
                  onClick={() => window.location.href = '/subscription'}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  {t('subscription.upgrade')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">API Secret Key</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="password" 
                    readOnly 
                    value={apiKey || ''} 
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none"
                    placeholder="Chưa có API Key"
                  />
                  {!apiKey && <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl text-xs text-gray-400 font-bold italic">Chưa được tạo</div>}
                </div>
                {apiKey && (
                  <button 
                    onClick={() => copyToClipboard(apiKey)}
                    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    title="Copy Key"
                  >
                    <Copy size={20} className="text-gray-500" />
                  </button>
                )}
                <button 
                  onClick={handleGenerateApiKey}
                  disabled={generatingKey}
                  className="p-3 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  title="Tạo mới"
                >
                  <RefreshCw size={20} className={generatingKey ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="mt-4 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <ShieldCheck size={12} /> Cảnh báo: Tuyệt đối không chia sẻ API Key này. Bất kỳ ai có mã này đều có quyền truy cập dữ liệu của bạn.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 italic">Hướng dẫn nhanh:</h5>
              <code className="text-[11px] text-gray-500 block leading-relaxed">
                curl -X GET https://eduschedule.api/v1/sessions \<br/>
                &nbsp;&nbsp;-H "x-api-key: YOUR_API_KEY"
              </code>
            </div>
          </div>
        )}
      </section>
      {/* Giao diện */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{t('settings.appearance')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.appearanceDesc')}</p>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.theme')}</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="mt-1 block w-full sm:max-w-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
          >
            <option value="light">{t('settings.light')}</option>
            <option value="dark">{t('settings.dark')}</option>
            <option value="system">{t('settings.system')}</option>
          </select>
        </div>
      </section>

      <ConfirmModal
        isOpen={confirmModal.open}
        title={t('common.confirm', 'Xác nhận')}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(m => ({ ...m, open: false })); }}
        onClose={() => setConfirmModal(m => ({ ...m, open: false }))}
      />
    </div>
  );
};

export default Settings;
