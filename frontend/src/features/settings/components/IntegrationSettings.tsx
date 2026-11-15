import React from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import GoogleSyncStatus from './GoogleSyncStatus';

import type { TFunction } from 'i18next';

interface IntegrationSettingsProps {
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onSyncAll: () => void;
  syncing: boolean;
  t: TFunction;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  isGoogleConnected,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncAll,
  syncing,
  t,
}) => {
  return (
    <section className="space-y-5 motion-safe:animate-in motion-safe:fade-in duration-200">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t('settings.appConnection')}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.appConnectionDesc')}
        </p>
      </div>

      <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300 rounded-xl shrink-0">
            <CalendarDays size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 dark:text-white leading-tight mb-1.5">
              Google Calendar
            </p>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.15em] ${isGoogleConnected ? 'text-green-500' : 'text-gray-400'}`}
            >
              {isGoogleConnected
                ? t('settings.googleCalendarConnected')
                : t('settings.googleCalendarNotConnected')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={isGoogleConnected ? onDisconnectGoogle : onConnectGoogle}
          className={`w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
            isGoogleConnected
              ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
              : 'text-primary bg-primary/10 hover:bg-primary/20'
          }`}
        >
          {isGoogleConnected ? t('settings.disconnect') : t('settings.connect')}
        </button>
      </div>

      {isGoogleConnected && (
        <div className="p-4 sm:p-6 bg-primary/5 rounded-2xl border border-dashed border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-primary min-w-0">
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-primary/10 shrink-0">
              <RefreshCw
                size={24}
                aria-hidden="true"
                className={syncing ? 'motion-safe:animate-spin' : ''}
              />
            </div>
            <div>
              <p className="text-base font-semibold leading-snug mb-1.5">{t('settings.syncAll')}</p>
              <p className="text-sm opacity-70 leading-relaxed max-w-sm">
                {t('settings.syncAllDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSyncAll}
            disabled={syncing}
            className="w-full sm:w-auto shrink-0 px-5 py-3 bg-primary text-white text-sm font-semibold rounded-xl transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {syncing ? t('common.loading') : t('settings.syncNow')}
          </button>
        </div>
      )}
      {isGoogleConnected && <GoogleSyncStatus onReconnect={onConnectGoogle} />}
    </section>
  );
};

export default IntegrationSettings;
