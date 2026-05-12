import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useSettings = () => {
  const { t } = useTranslation();
  const { updateUser } = useAuth();

  const [centerName, setCenterName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [notifySessions, setNotifySessions] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiAccess, setHasApiAccess] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [tenantRes, userRes] = await Promise.all([api.get('/tenant'), api.get('/auth/me')]);

      setCenterName(tenantRes.data.name || '');
      setContactEmail(tenantRes.data.contact_email || '');
      setMenuSettings(
        tenantRes.data.settings?.menu || {
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

      setFullName(userRes.data.full_name || '');
      setNotifySessions(userRes.data.notify_upcoming_sessions);
      setIsGoogleConnected(userRes.data.is_google_connected);

      try {
        const apiRes = await api.get('/tenant/api-key');
        if (apiRes.data.hasAccess) {
          setApiKey(apiRes.data.apiKey);
          setHasApiAccess(true);
        } else {
          setHasApiAccess(false);
        }
      } catch (err) {
        setHasApiAccess(false);
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
        settings: { menu: menuSettings },
      });
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
        notify_upcoming_sessions: notifySessions,
      });
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
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

  const handleGenerateApiKey = async () => {
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
  };

  return {
    centerName,
    setCenterName,
    contactEmail,
    setContactEmail,
    fullName,
    setFullName,
    notifySessions,
    setNotifySessions,
    isGoogleConnected,
    setIsGoogleConnected,
    apiKey,
    setApiKey,
    hasApiAccess,
    loading,
    saving,
    generatingKey,
    syncing,
    menuSettings,
    setMenuSettings,
    handleSaveTenant,
    handleSaveFeatures,
    handleSaveUser,
    handleSyncAll,
    handleGenerateApiKey,
  };
};
