import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getTenant,
  updateTenant as updateTenantApi,
  getApiKeyInfo,
  generateApiKey,
  getGoogleAuthUrl,
  disconnectGoogle,
  syncAllGoogle,
} from '@/services/settingsService';
import { getCurrentUser, updateProfile } from '@/services/authService';
import toast from 'react-hot-toast';
import { Key, Building, User, Globe, Palette, ChevronRight, Zap } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/utils/constants';

type SettingSection = 'general' | 'profile' | 'features' | 'integration' | 'api' | 'appearance';

import GeneralSettings from '@/features/settings/components/GeneralSettings';
import ProfileSettings from '@/features/settings/components/ProfileSettings';
import MenuConfigSettings from '@/features/settings/components/MenuConfigSettings';
import IntegrationSettings from '@/features/settings/components/IntegrationSettings';
import ApiSettings from '@/features/settings/components/ApiSettings';
import AppearanceSettings from '@/features/settings/components/AppearanceSettings';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingSection>('general');

  const [centerName, setCenterName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [notifySessions, setNotifySessions] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiAccess, setHasApiAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [menuSettings, setMenuSettings] = useState<Record<string, boolean>>({
    dashboard: true,
    schedule: true,
    classes: true,
    attendance: true,
    students: true,
    teachers: true,
    rooms: true,
    branches: true,
    import: true,
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: '', onConfirm: () => {} });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [tenantData, userData] = await Promise.all([getTenant(), getCurrentUser()]);

        setCenterName(tenantData.name || '');
        setContactEmail(tenantData.contact_email || '');
        setMenuSettings(
          tenantData.settings?.menu || {
            dashboard: true,
            schedule: true,
            classes: true,
            attendance: true,
            students: true,
            teachers: true,
            rooms: true,
            branches: true,
            import: true,
          }
        );

        setFullName(userData.full_name || '');
        setNotifySessions(userData.notify_upcoming_sessions);
        setIsGoogleConnected(userData.is_google_connected);

        // Fetch API Key if available
        try {
          const apiData = await getApiKeyInfo();
          if (apiData.hasAccess) {
            setApiKey(apiData.apiKey || null);
            setHasApiAccess(true);
          } else {
            setHasApiAccess(false);
          }
        } catch (err: any) {
          console.error('Failed to fetch API key info:', err);
          setHasApiAccess(false);
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
      await updateTenantApi({ name: centerName, contact_email: contactEmail });
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await updateTenantApi({
        name: centerName,
        contact_email: contactEmail,
        settings: { menu: menuSettings },
      });

      // Update local user context so menu updates immediately
      updateUser({ tenant_settings: data.settings });

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
      await updateProfile({
        full_name: fullName,
        notify_upcoming_sessions: notifySessions,
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
      const data = await getGoogleAuthUrl();
      window.location.href = data.url;
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
          await disconnectGoogle();
          setIsGoogleConnected(false);
          toast.success(t('settings.disconnectSuccess'));
        } catch (error) {
          toast.error(t('settings.disconnectError'));
        }
      },
    });
  };
  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const data = await syncAllGoogle();
      toast.success(data.message);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateApiKey = () => {
    if (apiKey) {
      setConfirmModal({
        open: true,
        message: t('settings.generateKeyConfirm'),
        onConfirm: async () => {
          setGeneratingKey(true);
          try {
            const data = await generateApiKey();
            setApiKey(data.apiKey);
            toast.success(t('common.success'));
          } catch (error) {
            toast.error(t('common.error'));
          } finally {
            setGeneratingKey(false);
          }
        },
      });
    } else {
      // No existing key, generate directly
      (async () => {
        setGeneratingKey(true);
        try {
          const data = await generateApiKey();
          setApiKey(data.apiKey);
          toast.success(t('common.success'));
        } catch (error) {
          toast.error(t('common.error'));
        } finally {
          setGeneratingKey(false);
        }
      })();
    }
  };

  const navItems = [
    {
      id: 'general' as SettingSection,
      icon: Building,
      label: t('settings.basicInfo'),
      roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    },
    {
      id: 'profile' as SettingSection,
      icon: User,
      label: t('settings.personalSettings'),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.STAFF,
        USER_ROLES.TEACHER,
        USER_ROLES.STUDENT,
        USER_ROLES.SUPER_ADMIN,
      ],
    },
    {
      id: 'features' as SettingSection,
      icon: Zap,
      label: t('settings.menuConfig'),
      roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    },
    {
      id: 'integration' as SettingSection,
      icon: Globe,
      label: t('settings.appConnection'),
      roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    },
    {
      id: 'api' as SettingSection,
      icon: Key,
      label: t('settings.apiTitle'),
      roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    },
    {
      id: 'appearance' as SettingSection,
      icon: Palette,
      label: t('settings.appearance'),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.STAFF,
        USER_ROLES.TEACHER,
        USER_ROLES.STUDENT,
        USER_ROLES.SUPER_ADMIN,
      ],
    },
  ].filter((item) => user?.role && item.roles.includes(user.role));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 max-w-6xl w-full mx-auto overflow-hidden pb-2 sm:pb-4">
        {/* Side Navigation Sub-menu */}
        <aside className="w-full lg:w-60 shrink-0 sticky top-0 z-20 self-start">
          <div className="bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-xl shadow-gray-200/20 dark:shadow-none border border-white dark:border-gray-700/50 p-1 lg:p-3 flex lg:flex-col items-center lg:items-stretch justify-start lg:justify-start gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center lg:justify-between px-0 py-2 lg:px-4 lg:py-3 rounded-lg lg:rounded-xl transition-all duration-300 group min-w-[54px] sm:min-w-[60px] lg:min-w-0 ${
                  activeSection === item.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-primary'
                }`}
                title={item.label}
              >
                <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                  <item.icon
                    size={18}
                    className={
                      activeSection === item.id
                        ? 'text-white'
                        : 'group-hover:scale-110 transition-transform'
                    }
                  />
                  <span
                    className={`text-[9px] lg:text-sm font-bold truncate ${activeSection === item.id ? 'opacity-100' : 'opacity-60 lg:opacity-100'}`}
                  >
                    {item.id === 'general'
                      ? t('common.general')
                      : item.id === 'profile'
                        ? t('common.profile')
                        : item.id === 'features'
                          ? t('common.features')
                          : item.id === 'integration'
                            ? t('common.app')
                            : item.id === 'api'
                              ? t('common.api')
                              : item.label}
                  </span>
                </div>
                <ChevronRight size={14} className="hidden lg:block opacity-50" />
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/20 dark:shadow-none border border-white dark:border-gray-700/50 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar transition-all">
            {activeSection === 'general' && (
              <GeneralSettings
                centerName={centerName}
                setCenterName={setCenterName}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                onSave={handleSaveTenant}
                saving={saving}
                t={t}
              />
            )}

            {activeSection === 'profile' && (
              <ProfileSettings
                fullName={fullName}
                setFullName={setFullName}
                notifySessions={notifySessions}
                setNotifySessions={setNotifySessions}
                onSave={handleSaveUser}
                saving={saving}
                t={t}
              />
            )}

            {activeSection === 'features' && (
              <MenuConfigSettings
                menuSettings={menuSettings}
                setMenuSettings={setMenuSettings}
                onSave={handleSaveFeatures}
                saving={saving}
                t={t}
              />
            )}

            {activeSection === 'integration' && (
              <IntegrationSettings
                isGoogleConnected={isGoogleConnected}
                onConnectGoogle={handleConnectGoogle}
                onDisconnectGoogle={handleDisconnectGoogle}
                onSyncAll={handleSyncAll}
                syncing={syncing}
                t={t}
              />
            )}

            {activeSection === 'api' && (
              <ApiSettings
                hasApiAccess={hasApiAccess}
                apiKey={apiKey}
                generatingKey={generatingKey}
                onGenerateKey={handleGenerateApiKey}
                t={t}
              />
            )}

            {activeSection === 'appearance' && (
              <AppearanceSettings theme={theme} setTheme={setTheme} t={t} />
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title={t('common.confirm')}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((m) => ({ ...m, open: false }));
        }}
        onClose={() => setConfirmModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
};

export default Settings;
