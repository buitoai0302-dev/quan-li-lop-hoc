import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Key, Copy, RefreshCw, ShieldCheck, Building, User, Globe, Palette, ChevronRight, Zap, LayoutDashboard, Calendar, BookOpen, ClipboardCheck, Users, DoorOpen, Import } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../utils/constants';

type SettingSection = 'general' | 'profile' | 'features' | 'integration' | 'api' | 'appearance';

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
        setMenuSettings(tenantRes.data.settings?.menu || {
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

        setFullName(userRes.data.full_name || '');
        setNotifySessions(userRes.data.notify_upcoming_sessions);
        setIsGoogleConnected(userRes.data.is_google_connected);

        // Fetch API Key if available
        try {
          const apiRes = await api.get('/tenant/api-key');
          if (apiRes.data.hasAccess) {
            setApiKey(apiRes.data.apiKey);
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
      await api.put('/tenant', { name: centerName, contact_email: contactEmail });
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
      const res = await api.put('/tenant', {
        name: centerName,
        contact_email: contactEmail,
        settings: { menu: menuSettings }
      });

      // Update local user context so menu updates immediately
      updateUser({ tenant_settings: res.data.settings });

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
      const response = await api.get('/google/url');
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
          await api.delete('/google/disconnect');
          setIsGoogleConnected(false);
          toast.success(t('settings.disconnectSuccess'));
        } catch (error) {
          toast.error(t('settings.disconnectError'));
        }
      }
    });
  };
  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await api.post('/google/sync-all');
      toast.success(res.data.message);
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
    toast.success(t('settings.copied'));
  };


  const navItems = [
    { id: 'general' as SettingSection, icon: Building, label: t('settings.basicInfo'), roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    { id: 'profile' as SettingSection, icon: User, label: t('settings.personalSettings'), roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN] },
    { id: 'features' as SettingSection, icon: Zap, label: t('settings.menuConfig'), roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    { id: 'integration' as SettingSection, icon: Globe, label: t('settings.appConnection'), roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    { id: 'api' as SettingSection, icon: Key, label: t('settings.apiTitle'), roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    { id: 'appearance' as SettingSection, icon: Palette, label: t('settings.appearance'), roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN] },
  ].filter(item => user?.role && item.roles.includes(user.role));

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
                className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center lg:justify-between px-0 py-2 lg:px-4 lg:py-3 rounded-lg lg:rounded-xl transition-all duration-300 group min-w-[54px] sm:min-w-[60px] lg:min-w-0 ${activeSection === item.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-primary'
                  }`}
                title={item.label}
              >
                <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                  <item.icon size={18} className={activeSection === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                  <span className={`text-[9px] lg:text-sm font-bold truncate ${activeSection === item.id ? 'opacity-100' : 'opacity-60 lg:opacity-100'}`}>
                    {item.id === 'general' ? t('common.general') :
                      item.id === 'profile' ? t('common.profile') :
                        item.id === 'features' ? t('common.features') :
                          item.id === 'integration' ? t('common.app') :
                            item.id === 'api' ? t('common.api') :
                              item.label}
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

            {/* General Settings Section */}
            {activeSection === 'general' && (
              <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('settings.basicInfo')}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.basicInfoDesc')}</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('settings.centerName')}</label>
                    <input
                      type="text"
                      value={centerName}
                      onChange={(e) => setCenterName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('settings.contactEmail')}</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={handleSaveTenant}
                    disabled={saving}
                    className="w-full sm:w-auto px-12 py-4 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </section>
            )}

            {/* Profile Settings Section */}
            {activeSection === 'profile' && (
              <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('settings.personalSettings')}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.personalSettingsDesc')}</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('settings.displayName')}</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 dark:text-white mb-1.5">{t('settings.notifications')}</p>
                      <p className="text-xs text-gray-400 leading-relaxed max-w-sm">{t('settings.notificationDesc')}</p>
                    </div>
                    <div
                      onClick={() => setNotifySessions(!notifySessions)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out ${notifySessions ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${notifySessions ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={handleSaveUser}
                    disabled={saving}
                    className="w-full sm:w-auto px-12 py-4 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </section>
            )}

            {/* Features Settings Section */}
            {activeSection === 'features' && (
              <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('settings.menuConfig')}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.menuConfigDesc')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(menuSettings).map((key) => (
                    <div key={key} className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-transparent hover:border-primary/20 hover:bg-white dark:hover:bg-gray-800 transition-all flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${menuSettings[key] ? 'text-primary' : 'text-gray-400'}`}>
                          {key === 'dashboard' && <LayoutDashboard size={16} />}
                          {key === 'schedule' && <Calendar size={16} />}
                          {key === 'classes' && <BookOpen size={16} />}
                          {key === 'attendance' && <ClipboardCheck size={16} />}
                          {key === 'students' && <Users size={16} />}
                          {key === 'teachers' && <Users size={16} />}
                          {key === 'rooms' && <DoorOpen size={16} />}
                          {key === 'branches' && <Building size={16} />}
                          {key === 'import' && <Import size={16} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">{t(`menu.${key}`)}</span>
                          {(key === 'attendance' || key === 'branches') && (
                            <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm flex items-center justify-center">
                              <span className="text-[8px] font-black text-white uppercase tracking-tighter">PRO</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        onClick={() => setMenuSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out ${menuSettings[key] ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                      >
                        <span className={`absolute top-1 h-3 w-3 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${menuSettings[key] ? 'left-5' : 'left-1'}`} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleSaveFeatures}
                    disabled={saving}
                    className="w-full sm:w-auto px-12 py-4 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </section>
            )}

            {/* Integration Settings Section */}
            {activeSection === 'integration' && (
              <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('settings.appConnection')}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.appConnectionDesc')}</p>
                </div>

                <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-inner shrink-0">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="h-10 w-10" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-1.5">Google Calendar</p>
                      <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${isGoogleConnected ? 'text-green-500' : 'text-gray-400'}`}>
                        {isGoogleConnected ? t('settings.googleCalendarConnected') : t('settings.googleCalendarNotConnected')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={isGoogleConnected ? handleDisconnectGoogle : handleConnectGoogle}
                    className={`w-full sm:w-auto px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isGoogleConnected
                      ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                      : 'text-primary bg-primary/10 hover:bg-primary/20'
                      }`}
                  >
                    {isGoogleConnected ? t('settings.disconnect') : t('settings.connect')}
                  </button>
                </div>

                {isGoogleConnected && (
                  <div className="p-8 bg-primary/5 rounded-3xl border border-dashed border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6 text-primary">
                      <div className={`p-5 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-primary/10 shrink-0 ${syncing ? 'animate-pulse' : ''}`}>
                        <RefreshCw size={28} className={syncing ? 'animate-spin' : ''} />
                      </div>
                      <div>
                        <p className="text-base font-black tracking-tight leading-none mb-1.5">{t('settings.syncAll')}</p>
                        <p className="text-sm opacity-70 leading-relaxed max-w-sm">{t('settings.syncAllDesc')}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSyncAll}
                      disabled={syncing}
                      className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {syncing ? t('common.loading') : t('settings.syncNow')}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* API Settings Section */}
            {activeSection === 'api' && (
              <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('settings.apiTitle')}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.apiDesc')}</p>
                </div>

                {!hasApiAccess ? (
                  <div className="p-10 bg-gradient-to-br from-indigo-50/50 via-blue-50/50 to-white dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-gray-800/50 rounded-[3rem] border border-blue-100 dark:border-blue-800/30 relative overflow-hidden group text-center">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                      <ShieldCheck size={160} />
                    </div>
                    <div className="relative z-10 max-w-md mx-auto flex flex-col items-center">
                      <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl shadow-xl mb-8">
                        <ShieldCheck className="text-primary" size={40} />
                      </div>
                      <h4 className="text-2xl font-black text-blue-900 dark:text-blue-100 mb-4 italic tracking-tight">{t('settings.apiUpgradeTitle')}</h4>
                      <p className="text-sm text-blue-700/80 dark:text-blue-300/80 leading-relaxed mb-10">
                        {t('settings.apiUpgradeDesc')}
                      </p>
                      <button
                        onClick={() => window.location.href = '/subscription'}
                        className="px-12 py-4 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-2xl shadow-primary/30 active:scale-95"
                      >
                        {t('subscription.upgrade')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-5 ml-1">API Secret Key</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                          <input
                            type="password"
                            readOnly
                            value={apiKey || ''}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-4.5 text-sm font-mono focus:outline-none transition-all shadow-inner"
                            placeholder={t('settings.apiKeyPlaceholder')}
                          />
                          {!apiKey && (
                            <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl text-[10px] text-gray-400 font-black uppercase tracking-widest">
                              {t('settings.apiKeyNotCreated')}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-4">
                          {apiKey && (
                            <button
                              onClick={() => copyToClipboard(apiKey)}
                              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95"
                              title="Copy Key"
                            >
                              <Copy size={24} className="text-gray-500" />
                            </button>
                          )}
                          <button
                            onClick={handleGenerateApiKey}
                            disabled={generatingKey}
                            className="flex-1 sm:flex-none p-4 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                            title={t('settings.generate')}
                          >
                            <RefreshCw size={24} className={generatingKey ? 'animate-spin' : ''} />
                            <span className="sm:hidden font-black uppercase text-[10px] tracking-widest">{t('settings.generate')}</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-6 px-5 py-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30 flex items-center gap-3">
                        <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                          {t('settings.apiWarning')}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-8 shadow-inner overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Quick Start</span>
                      </div>
                      <h5 className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">{t('settings.quickGuide')}</h5>
                      <div className="overflow-x-auto custom-scrollbar-thin">
                        <code className="text-xs text-emerald-400 font-mono whitespace-nowrap">
                          <span className="text-gray-500">curl -X GET</span> https://eduschedule.api/v1/sessions \<br />
                          &nbsp;&nbsp;<span className="text-gray-500">-H</span> "x-api-key: YOUR_API_KEY"
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Appearance Settings Section */}
            {activeSection === 'appearance' && (
              <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('settings.appearance')}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.appearanceDesc')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'light', icon: <Palette size={20} className="text-amber-500" />, label: t('settings.light') },
                    { id: 'dark', icon: <Palette size={20} className="text-indigo-500" />, label: t('settings.dark') },
                    { id: 'system', icon: <Palette size={20} className="text-gray-500" />, label: t('settings.system') },
                  ].map((tItem) => (
                    <button
                      key={tItem.id}
                      onClick={() => setTheme(tItem.id as any)}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${theme === tItem.id
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-primary/50'
                        }`}
                    >
                      <div className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-transform group-hover:scale-110 ${theme === tItem.id ? 'text-primary' : 'text-gray-400'}`}>
                        {tItem.icon}
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${theme === tItem.id ? 'text-primary' : 'text-gray-500'}`}>
                        {tItem.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title={t('common.confirm')}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(m => ({ ...m, open: false })); }}
        onClose={() => setConfirmModal(m => ({ ...m, open: false }))}
      />
    </div>
  );
};

export default Settings;
