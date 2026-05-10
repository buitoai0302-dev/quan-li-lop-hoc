import React from 'react';
import { RefreshCw } from 'lucide-react';

interface IntegrationSettingsProps {
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onSyncAll: () => void;
  syncing: boolean;
  t: any;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  isGoogleConnected,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncAll,
  syncing,
  t
}) => {
  return (
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
          onClick={isGoogleConnected ? onDisconnectGoogle : onConnectGoogle}
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
            onClick={onSyncAll}
            disabled={syncing}
            className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {syncing ? t('common.loading') : t('settings.syncNow')}
          </button>
        </div>
      )}
    </section>
  );
};

export default IntegrationSettings;
