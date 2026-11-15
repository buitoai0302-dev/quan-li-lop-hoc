import PageError from '@/components/common/PageError';
import PageLoading from '@/components/common/PageLoading';
import { useNavigationPrompt } from '@/hooks/useNavigationPrompt';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getTenant,
  updateTenant as updateTenantApi,
  getApiKeyInfo,
  generateApiKey,
  getGoogleAuthUrl,
  disconnectGoogle,
  syncAllGoogle,
} from '@/features/settings';
import { getCurrentUser, updateProfile } from '@/features/auth';
import toast from 'react-hot-toast';
import { Key, Building, User, Globe, Palette, ChevronRight, Zap } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/utils/constants';

interface SettingsSnapshot {
  centerName: string;
  contactEmail: string;
  fullName: string;
  notifySessions: boolean;
  menuSettings: Record<string, boolean>;
}

const DEFAULT_MENU_SETTINGS: Record<string, boolean> = {
  dashboard: true,
  schedule: true,
  classes: true,
  attendance: true,
  students: true,
  teachers: true,
  rooms: true,
  branches: true,
  tuition: true,
  import: true,
  subscription: true,
};

type SettingSection = 'general' | 'profile' | 'features' | 'integration' | 'api' | 'appearance';

import GeneralSettings from '@/features/settings/components/GeneralSettings';
import ProfileSettings from '@/features/settings/components/ProfileSettings';
import MenuConfigSettings from '@/features/settings/components/MenuConfigSettings';
import IntegrationSettings from '@/features/settings/components/IntegrationSettings';
import ApiSettings from '@/features/settings/components/ApiSettings';
import AppearanceSettings from '@/features/settings/components/AppearanceSettings';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const canManageCenter = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
  const [activeSection, setActiveSection] = useState<SettingSection>(
    canManageCenter ? 'general' : 'profile'
  );
  useEffect(() => {
    const result = searchParams.get('google_sync');
    if (result !== 'success' && result !== 'error') return;
    setActiveSection('integration');
    if (result === 'success')
      toast.success(t('settings.googleCalendarConnected'), { id: 'google-connection' });
    else {
      const key =
        searchParams.get('code') === 'GOOGLE_OAUTH_INVALID_STATE'
          ? 'errors.GOOGLE_OAUTH_INVALID_STATE'
          : 'errors.GOOGLE_CONNECTION_FAILED';
      toast.error(t(key), { id: 'google-connection' });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('google_sync');
    next.delete('code');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, t]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [savedSettings, setSavedSettings] = useState<SettingsSnapshot | null>(null);

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
  const [menuSettings, setMenuSettings] = useState<Record<string, boolean>>(DEFAULT_MENU_SETTINGS);
  const isDirty =
    savedSettings !== null &&
    (centerName !== savedSettings.centerName ||
      contactEmail !== savedSettings.contactEmail ||
      fullName !== savedSettings.fullName ||
      notifySessions !== savedSettings.notifySessions ||
      JSON.stringify(menuSettings) !== JSON.stringify(savedSettings.menuSettings));
  const blocker = useNavigationPrompt(isDirty);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: '', onConfirm: () => {} });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const fetchSettings = async () => {
      try {
        const [userData, tenantData] = await Promise.all([
          getCurrentUser(),
          canManageCenter ? getTenant() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const snapshot: SettingsSnapshot = {
          centerName: tenantData?.name || '',
          contactEmail: tenantData?.contact_email || '',
          fullName: userData.full_name || '',
          notifySessions: Boolean(userData.notify_upcoming_sessions),
          menuSettings: { ...DEFAULT_MENU_SETTINGS, ...tenantData?.settings?.menu },
        };
        setCenterName(snapshot.centerName);
        setContactEmail(snapshot.contactEmail);
        setFullName(snapshot.fullName);
        setNotifySessions(snapshot.notifySessions);
        setMenuSettings(snapshot.menuSettings);
        setSavedSettings(snapshot);
        setIsGoogleConnected(Boolean(userData.is_google_connected));
        if (canManageCenter) {
          try {
            const apiData = await getApiKeyInfo();
            if (!cancelled) {
              setApiKey(apiData.apiKey || null);
              setHasApiAccess(apiData.hasAccess);
            }
          } catch {
            if (!cancelled) setHasApiAccess(false);
          }
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchSettings();
    return () => {
      cancelled = true;
    };
  }, [canManageCenter, loadAttempt]);

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateTenantApi({ name: centerName, contact_email: contactEmail });
      setSavedSettings((previous) => previous && { ...previous, centerName, contactEmail });
      toast.success(t('common.success'));
    } catch {
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
        name: savedSettings?.centerName || centerName,
        contact_email: savedSettings?.contactEmail ?? contactEmail,
        settings: { menu: menuSettings },
      });

      // Update local user context so menu updates immediately
      updateUser({ tenant_settings: data.settings as any });
      setSavedSettings((previous) => previous && { ...previous, menuSettings });

      toast.success(t('common.success'));
    } catch {
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
      updateUser({ full_name: fullName, notify_upcoming_sessions: notifySessions });
      setSavedSettings((previous) => previous && { ...previous, fullName, notifySessions });
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const data = await getGoogleAuthUrl();
      window.location.href = data.url;
    } catch {
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
        } catch {
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
    } catch {
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
          } catch {
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
        } catch {
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

  if (loading) return <PageLoading />;
  if (loadError) return <PageError onRetry={() => setLoadAttempt((attempt) => attempt + 1)} />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 max-w-6xl w-full mx-auto overflow-hidden pb-2 sm:pb-4">
        {/* Side Navigation Sub-menu */}
        <aside className="w-full lg:w-60 shrink-0 sticky top-0 z-20 self-start">
          <div className="bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-xl shadow-gray-200/20 dark:shadow-none border border-white dark:border-gray-700/50 p-1 lg:p-3 grid grid-cols-3 sm:flex lg:flex-col items-center lg:items-stretch gap-0.5 sm:gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                aria-current={activeSection === item.id ? 'page' : undefined}
                className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center lg:justify-between px-0 py-2 lg:px-4 lg:py-3 rounded-lg lg:rounded-xl transition-all duration-300 group min-w-0 ${
                  activeSection === item.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-primary'
                }`}
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
                  <span className={`text-xs lg:text-sm font-semibold truncate`}>
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
        isOpen={blocker.state === 'blocked'}
        title={t('common.unsavedChanges')}
        message={t('common.unsavedDescription')}
        confirmText={t('common.leave')}
        cancelText={t('common.stay')}
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed();
        }}
        onClose={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
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
