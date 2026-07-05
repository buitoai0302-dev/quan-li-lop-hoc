import React from 'react';

import type { TFunction } from 'i18next';

interface GeneralSettingsProps {
  centerName: string;
  setCenterName: (name: string) => void;
  contactEmail: string;
  setContactEmail: (email: string) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  t: TFunction;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  centerName,
  setCenterName,
  contactEmail,
  setContactEmail,
  onSave,
  saving,
  t,
}) => {
  return (
    <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('settings.basicInfo')}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.basicInfoDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-2.5">
          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
            {t('settings.centerName')}
          </label>
          <input
            type="text"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-2.5">
          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
            {t('settings.contactEmail')}
          </label>
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
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto px-12 py-4 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </section>
  );
};

export default GeneralSettings;
