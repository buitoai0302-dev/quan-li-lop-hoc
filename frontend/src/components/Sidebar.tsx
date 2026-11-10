import { Link, NavLink } from 'react-router-dom';
import { X, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Download } from 'lucide-react';
import ConfirmModal from './common/ConfirmModal';
import ActionHint from './common/ActionHint';
import type { User } from '@/types';
import { getMenuItems } from '../routes';
import type { MenuGroup, MenuItem } from '../routes';
import { USER_ROLES, MENU_KEYS, ROUTES } from '../utils/constants';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onLogout }) => {
  const { t } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { isInstallable, promptInstall } = usePWAInstall();

  const menuItems = getMenuItems(t, user?.role);

  const visibleGroups: MenuGroup[] = menuItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item: MenuItem) => {
        const hasRole =
          (!group.roles || group.roles.includes(user?.role || '')) &&
          (!item.roles || item.roles.includes(user?.role || ''));
        if (!hasRole) return false;
        const menuKey = item.path.substring(1).split('/')[0] || MENU_KEYS.DASHBOARD;
        if (
          [
            MENU_KEYS.SETTINGS,
            USER_ROLES.ADMIN,
            MENU_KEYS.SUBSCRIPTION,
            MENU_KEYS.HELP,
            MENU_KEYS.ACTIVITIES,
          ].includes(menuKey)
        )
          return true;
        const isEnabled = user?.tenant_settings?.menu?.[menuKey] ?? true;
        return isEnabled;
      }),
    }))
    .filter((group) => group.items.length > 0);

  // Dynamic: all groups expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(visibleGroups.map((_, i) => [i, true]))
  );

  const toggleGroup = (idx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 z-[90] lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-[110] bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 shadow-xl flex flex-col transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isCollapsed ? 'sidebar--collapsed w-60 lg:w-[68px]' : 'w-60'}`}
      >
        <div
          className={`p-4 border-b border-gray-100 dark:border-slate-800/50 flex items-center justify-between gap-2 relative transition-all ${isCollapsed ? 'lg:p-4' : 'sm:p-5'}`}
        >
          <div
            className={`flex items-center min-w-0 overflow-hidden ${isCollapsed ? 'lg:gap-0' : 'gap-2'}`}
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-lg shadow-md shadow-primary/10 object-cover shrink-0 mx-auto"
            />
            <div
              className={`min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:w-0 lg:opacity-0 hidden lg:block' : 'w-auto opacity-100'}`}
            >
              <h1 className="text-xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent tracking-tight leading-tight truncate">
                {t('common.appName')}
              </h1>
              <div className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] truncate">
                {user?.tenant_name || t('common.premiumEdition')}
              </div>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all shrink-0"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className={`flex-1 space-y-3 overflow-y-auto overflow-x-hidden transition-all ${isCollapsed ? 'lg:px-2 lg:py-3 hide-scrollbar' : 'p-2 sm:p-3 custom-scrollbar'}`}
        >
          {visibleGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.group && (
                <ActionHint
                  label={group.group}
                  fullWidth
                  enabled={isCollapsed}
                  showTouchLabel={false}
                >
                  <button
                    onClick={() => !isCollapsed && toggleGroup(groupIdx)}
                    className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0' : 'justify-between'} px-2 sm:px-3 py-1.5 group/header`}
                  >
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 transition-colors whitespace-nowrap overflow-hidden ${isCollapsed ? 'lg:hidden' : 'group-hover/header:text-primary'}`}
                    >
                      {group.group}
                    </p>
                    {isCollapsed ? (
                      <div className="hidden lg:block w-4 h-px bg-gray-300 dark:bg-gray-700 my-2 mx-auto" />
                    ) : (
                      <div className="text-gray-300 dark:text-gray-600 group-hover/header:text-primary transition-colors">
                        {expandedGroups[groupIdx] ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </div>
                    )}
                  </button>
                </ActionHint>
              )}

              <div
                className={`space-y-1 transition-all duration-300 overflow-hidden ${expandedGroups[groupIdx] || isCollapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                {group.items.map((item) => (
                  <ActionHint
                    key={item.path}
                    label={item.label}
                    fullWidth
                    enabled={isCollapsed}
                    showTouchLabel={false}
                  >
                    <NavLink
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          onClose();
                        }
                      }}
                      className={({ isActive }) =>
                        `flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                        } ${isCollapsed ? 'lg:justify-center lg:px-0 lg:gap-0 px-3 gap-3' : 'px-3 gap-3'}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}
                          >
                            <item.icon size={20} />
                          </div>
                          <span
                            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0 hidden lg:block lg:flex-none' : 'flex-1 w-auto opacity-100 block'}`}
                          >
                            {item.label}
                          </span>
                          {item.isPremium &&
                            [
                              USER_ROLES.ADMIN,
                              USER_ROLES.STAFF,
                              USER_ROLES.SUPER_ADMIN,
                              USER_ROLES.TEACHER,
                            ].includes(user?.role || '') && (
                              <div
                                className={`flex items-center justify-center bg-gradient-to-tr from-amber-400 to-orange-500 rounded-md shadow-md shadow-orange-500/20 animate-pulse transition-all duration-300 overflow-hidden ${isCollapsed ? 'lg:w-0 lg:h-0 lg:p-0 lg:opacity-0 hidden lg:flex' : 'px-1.5 py-0.5'}`}
                              >
                                <span className="text-[7px] font-black text-white uppercase tracking-tighter">
                                  PRO
                                </span>
                              </div>
                            )}
                        </>
                      )}
                    </NavLink>
                  </ActionHint>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-200 dark:border-slate-800 relative">
          {/* Collapse Toggle Button */}
          <ActionHint
            label={isCollapsed ? t('common.expand') : t('common.collapse')}
            showTouchLabel={false}
          >
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex absolute -right-3 top-[-16px] w-6 h-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full items-center justify-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400 shadow-sm z-10 transition-transform"
            >
              {isCollapsed ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronDown size={12} className="rotate-90" />
              )}
            </button>
          </ActionHint>

          {isInstallable && (
            <div
              className={`mb-2 transition-all duration-300 overflow-hidden ${isCollapsed ? 'lg:hidden' : 'block'}`}
            >
              <button
                onClick={promptInstall}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl transition-colors shadow-sm"
              >
                <Download size={16} className="animate-bounce shrink-0" />
                <span className="text-sm font-bold whitespace-nowrap overflow-hidden">
                  {t('common.installApp', 'CÃ i Ä‘áº·t App')}
                </span>
              </button>
            </div>
          )}

          <div
            className={`flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-xl border border-gray-100 dark:border-slate-800 mb-1 transition-all duration-300 ${isCollapsed ? 'lg:flex-col lg:justify-center lg:gap-1' : 'justify-between'}`}
          >
            <div
              className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:gap-0' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-inner shrink-0 border-2 border-white dark:border-gray-800">
                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              <div
                className={`min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:w-0 lg:opacity-0 hidden lg:block' : 'w-auto opacity-100 block'}`}
              >
                <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate leading-none mb-1">
                  {user?.full_name}
                </p>
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter truncate">
                  {user?.role}
                </p>
              </div>
            </div>
            <ActionHint label={t('auth.logout')}>
              <button
                onClick={() => {
                  setShowLogoutConfirm(true);
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all active:scale-90 shrink-0"
              >
                <LogOut size={18} />
              </button>
            </ActionHint>
          </div>

          {/* License / Copyright Info */}
          <div
            className={`mt-2 text-center transition-all duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}
          >
            <div className="mb-2 flex justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <Link to={ROUTES.PRIVACY} onClick={onClose} className="hover:underline">
                {t('landing.privacy')}
              </Link>
              <Link to={ROUTES.TERMS} onClick={onClose} className="hover:underline">
                {t('landing.terms')}
              </Link>
            </div>
            <p className="text-[8px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-widest truncate px-1">
              &copy; 2026 EduSchedule. All rights reserved.
            </p>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title={t('auth.logoutConfirmTitle')}
        message={t('auth.logoutConfirmMessage')}
        confirmText={t('common.leave')}
        cancelText={t('common.stay')}
        type="danger"
      />
    </>
  );
};

export default Sidebar;
