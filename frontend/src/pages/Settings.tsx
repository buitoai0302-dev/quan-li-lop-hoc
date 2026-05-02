import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  const [centerName, setCenterName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/tenant');
        setCenterName(response.data.name || '');
        setContactEmail(response.data.contact_email || '');
      } catch (error) {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [t]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">{t('settings.title')}</h2>
      
      <div className="space-y-6">
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
                name="company-name" 
                id="company-name" 
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                required
                className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 border dark:bg-gray-700 dark:text-white" 
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.contactEmail')}</label>
            <div className="mt-1">
              <input 
                id="email" 
                name="email" 
                type="email" 
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 border dark:bg-gray-700 dark:text-white" 
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
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
        </div>

        <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button 
              type="submit" 
              onClick={handleSave}
              disabled={saving || loading}
              className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
