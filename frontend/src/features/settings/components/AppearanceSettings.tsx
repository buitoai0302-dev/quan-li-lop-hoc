import React from 'react';
import { Palette } from 'lucide-react';
import { THEMES } from '@/utils/constants';
import type { TFunction } from 'i18next';

type Theme = (typeof THEMES)[keyof typeof THEMES];

interface AppearanceSettingsProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: TFunction;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ theme, setTheme, t }) => {
  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('settings.appearance')}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.appearanceDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            id: THEMES.LIGHT,
            icon: <Palette size={20} className="text-amber-500" />,
            label: t('settings.light'),
          },
          {
            id: THEMES.DARK,
            icon: <Palette size={20} className="text-indigo-500" />,
            label: t('settings.dark'),
          },
          {
            id: THEMES.SYSTEM,
            icon: <Palette size={20} className="text-gray-500" />,
            label: t('settings.system'),
          },
        ].map((tItem) => (
          <button
            key={tItem.id}
            onClick={() => setTheme(tItem.id as any)}
            className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${
              theme === tItem.id
                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-primary/50'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-transform group-hover:scale-110 ${theme === tItem.id ? 'text-primary' : 'text-gray-400'}`}
            >
              {tItem.icon}
            </div>
            <span
              className={`text-[11px] font-black uppercase tracking-widest ${theme === tItem.id ? 'text-primary' : 'text-gray-500'}`}
            >
              {tItem.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default AppearanceSettings;
