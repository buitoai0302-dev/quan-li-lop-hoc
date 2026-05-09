import { NavLink } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import type { User } from '../contexts/AuthContext';
import { getMenuItems } from '../routes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onLogout }) => {
  const { t } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = getMenuItems(t, user?.role);

  const visibleMenuItems = menuItems.filter((item: any) => {
    if (!user?.role || !item.roles.includes(user.role)) return false;

    const menuKey = item.path.substring(1).split('/')[0] || 'dashboard';
    if (['settings', 'admin', 'subscription', 'help'].includes(menuKey)) return true;

    const isVisible = user.tenant_settings?.menu?.[menuKey] ?? true;
    return isVisible;
  });

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 z-[60] md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-[70] w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg shadow-md shadow-primary/10 object-cover shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent tracking-tight leading-tight truncate">
                {t('common.appName')}
              </h1>
              <div className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] truncate">{user?.tenant_name || t('common.premiumEdition')}</div>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all shrink-0"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}>
                    <item.icon size={20} />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {item.isPremium && ['admin', 'staff', 'super_admin'].includes(user?.role || '') && (
                    <div className="flex items-center justify-center px-1.5 py-0.5 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-md shadow-md shadow-orange-500/20 animate-pulse">
                      <span className="text-[7px] font-black text-white uppercase tracking-tighter">PRO</span>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-1 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800 mb-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-inner shrink-0 border-2 border-white dark:border-gray-800">
                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate leading-none mb-1">{user?.full_name}</p>
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all active:scale-90"
              title={t('auth.logout')}
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="mt-1 pt-1 border-t border-gray-100/50 dark:border-gray-700/30">
            <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity duration-500 cursor-default">
              <p className="text-[7px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em] leading-none">
                © {new Date().getFullYear()} {t('common.appName')} • {t('common.premiumSaaS')}
              </p>
            </div>
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
