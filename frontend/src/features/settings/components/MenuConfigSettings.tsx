import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardCheck,
  Users,
  DoorOpen,
  Building,
  Import,
} from 'lucide-react';

interface MenuConfigSettingsProps {
  menuSettings: Record<string, boolean>;
  setMenuSettings: (settings: any) => void;
  onSave: () => void;
  saving: boolean;
  t: any;
}

const MenuConfigSettings: React.FC<MenuConfigSettingsProps> = ({
  menuSettings,
  setMenuSettings,
  onSave,
  saving,
  t,
}) => {
  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('settings.menuConfig')}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.menuConfigDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.keys(menuSettings).map((key) => (
          <div
            key={key}
            className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-transparent hover:border-primary/20 hover:bg-white dark:hover:bg-gray-800 transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${menuSettings[key] ? 'text-primary' : 'text-gray-400'}`}
              >
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
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">
                  {t(`menu.${key}`)}
                </span>
                {(key === 'attendance' || key === 'branches') && (
                  <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm flex items-center justify-center">
                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">
                      PRO
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div
              onClick={() => setMenuSettings((prev: any) => ({ ...prev, [key]: !prev[key] }))}
              className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out ${menuSettings[key] ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span
                className={`absolute top-1 h-3 w-3 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${menuSettings[key] ? 'left-5' : 'left-1'}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1">
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

export default MenuConfigSettings;
