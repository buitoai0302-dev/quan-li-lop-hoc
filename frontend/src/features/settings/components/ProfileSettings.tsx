import React from 'react';

import type { ProfileSettingsProps } from '@/features/auth';

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  fullName,
  setFullName,
  notifySessions,
  setNotifySessions,
  onSave,
  saving,
  t,
}) => {
  return (
    <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('settings.personalSettings')}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.personalSettingsDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-2.5">
          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
            {t('settings.displayName')}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-white mb-1.5">
              {t('settings.notifications')}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              {t('settings.notificationDesc')}
            </p>
          </div>
          <div
            onClick={() => setNotifySessions(!notifySessions)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out ${notifySessions ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${notifySessions ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
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

export default ProfileSettings;
