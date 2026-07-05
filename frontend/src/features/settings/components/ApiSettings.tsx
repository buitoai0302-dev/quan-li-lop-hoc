import React from 'react';
import { ShieldCheck, Copy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';

interface ApiSettingsProps {
  hasApiAccess: boolean;
  apiKey: string | null;
  generatingKey: boolean;
  onGenerateKey: () => void;
  t: TFunction;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({
  hasApiAccess,
  apiKey,
  generatingKey,
  onGenerateKey,
  t,
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('settings.copied'));
  };

  return (
    <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('settings.apiTitle')}
        </h3>
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
            <h4 className="text-2xl font-black text-blue-900 dark:text-blue-100 mb-4 italic tracking-tight">
              {t('settings.apiUpgradeTitle')}
            </h4>
            <p className="text-sm text-blue-700/80 dark:text-blue-300/80 leading-relaxed mb-10">
              {t('settings.apiUpgradeDesc')}
            </p>
            <button
              onClick={() => (window.location.href = '/subscription')}
              className="px-12 py-4 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-2xl shadow-primary/30 active:scale-95"
            >
              {t('subscription.upgrade')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-5 ml-1">
              API Secret Key
            </label>
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
                  onClick={onGenerateKey}
                  disabled={generatingKey}
                  className="flex-1 sm:flex-none p-4 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                  title={t('settings.generate')}
                >
                  <RefreshCw size={24} className={generatingKey ? 'animate-spin' : ''} />
                  <span className="sm:hidden font-black uppercase text-[10px] tracking-widest">
                    {t('settings.generate')}
                  </span>
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
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                Quick Start
              </span>
            </div>
            <h5 className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">
              {t('settings.quickGuide')}
            </h5>
            <div className="overflow-x-auto custom-scrollbar-thin">
              <code className="text-xs text-emerald-400 font-mono whitespace-nowrap">
                <span className="text-gray-500">curl -X GET</span>{' '}
                https://eduschedule.api/v1/sessions \<br />
                &nbsp;&nbsp;<span className="text-gray-500">-H</span> "x-api-key: YOUR_API_KEY"
              </code>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ApiSettings;
