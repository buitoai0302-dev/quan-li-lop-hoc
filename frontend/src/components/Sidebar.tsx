import { NavLink } from 'react-router-dom';
import { X, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Download } from 'lucide-react';
import ConfirmModal from './common/ConfirmModal';
import type { User } from '@/types';
import { getMenuItems } from '../routes';
import type { MenuGroup, MenuItem } from '../routes';
import { USER_ROLES } from '../utils/constants';
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
        const menuKey = item.path.substring(1).split('/')[0] || 'dashboard';
        if (['settings', 'admin', 'subscription', 'help', 'activities'].includes(menuKey))
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
          className="fixed inset-0 bg-gray-900/60 z-[90] md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-[100] bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 shadow-xl flex flex-col transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'w-60 md:w-[68px]' : 'w-60'}`}
      >
        <div
          className={`p-4 border-b border-gray-100 dark:border-slate-800/50 flex items-center justify-between gap-2 relative transition-all ${isCollapsed ? 'md:p-4' : 'sm:p-5'}`}
        >
          <div
            className={`flex items-center min-w-0 overflow-hidden ${isCollapsed ? 'md:gap-0' : 'gap-2'}`}
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-lg shadow-md shadow-primary/10 object-cover shrink-0 mx-auto"
            />
            <div
              className={`min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'md:w-0 md:opacity-0 hidden md:block' : 'w-auto opacity-100'}`}
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
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all shrink-0"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className={`flex-1 space-y-3 overflow-y-auto overflow-x-hidden transition-all ${isCollapsed ? 'md:px-2 md:py-3 hide-scrollbar' : 'p-2 sm:p-3 custom-scrollbar'}`}
        >
          {visibleGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.group && (
                <button
                  onClick={() => !isCollapsed && toggleGroup(groupIdx)}
                  className={`w-full flex items-center ${isCollapsed ? 'md:justify-center md:px-0' : 'justify-between'} px-2 sm:px-3 py-1.5 group/header`}
                  title={isCollapsed ? group.group : undefined}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 transition-colors whitespace-nowrap overflow-hidden ${isCollapsed ? 'md:hidden' : 'group-hover/header:text-primary'}`}
                  >
                    {group.group}
                  </p>
                  {isCollapsed ? (
                    <div className="hidden md:block w-4 h-px bg-gray-300 dark:bg-gray-700 my-2 mx-auto" />
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
              )}

              <div
                className={`space-y-1 transition-all duration-300 overflow-hidden ${expandedGroups[groupIdx] || isCollapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        onClose();
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                      } ${isCollapsed ? 'md:justify-center md:px-0 md:gap-0 px-3 gap-3' : 'px-3 gap-3'}`
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
                          className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0 hidden md:block md:flex-none' : 'flex-1 w-auto opacity-100 block'}`}
                        >
                          {item.label}
                        </span>
                        {item.isPremium &&
                          [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN].includes(
                            user?.role || ''
                          ) && (
                            <div
                              className={`flex items-center justify-center bg-gradient-to-tr from-amber-400 to-orange-500 rounded-md shadow-md shadow-orange-500/20 animate-pulse transition-all duration-300 overflow-hidden ${isCollapsed ? 'md:w-0 md:h-0 md:p-0 md:opacity-0 hidden md:flex' : 'px-1.5 py-0.5'}`}
                            >
                              <span className="text-[7px] font-black text-white uppercase tracking-tighter">
                                PRO
                              </span>
                            </div>
                          )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-200 dark:border-slate-800 relative">
          {/* Collapse Toggle Button */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex absolute -right-3 top-[-16px] w-6 h-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full items-center justify-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400 shadow-sm z-10 transition-transform"
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed ? (
              <ChevronRight size={12} />
            ) : (
              <ChevronDown size={12} className="rotate-90" />
            )}
          </button>

          {isInstallable && (
            <div
              className={`mb-2 transition-all duration-300 overflow-hidden ${isCollapsed ? 'md:hidden' : 'block'}`}
            >
              <button
                onClick={promptInstall}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl transition-colors shadow-sm"
              >
                <Download size={16} className="animate-bounce shrink-0" />
                <span className="text-sm font-bold whitespace-nowrap overflow-hidden">
                  {t('common.installApp', 'Cài đặt App')}
                </span>
              </button>
            </div>
          )}

          <div
            className={`flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-xl border border-gray-100 dark:border-slate-800 mb-1 transition-all duration-300 ${isCollapsed ? 'md:justify-center' : 'justify-between'}`}
          >
            <div
              className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'md:gap-0' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-inner shrink-0 border-2 border-white dark:border-gray-800">
                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              <div
                className={`min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'md:w-0 md:opacity-0 hidden md:block' : 'w-auto opacity-100 block'}`}
              >
                <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate leading-none mb-1">
                  {user?.full_name}
                </p>
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter truncate">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowLogoutConfirm(true);
                if (window.innerWidth < 768) {
                  onClose();
                }
              }}
              className={`p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all active:scale-90 shrink-0 ${isCollapsed ? 'md:hidden' : 'block'}`}
              title={t('auth.logout')}
            >
              <LogOut size={18} />
            </button>
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
