import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, LayoutDashboard, Settings, Menu, X, LogOut, Building, BookOpen, DoorOpen, Globe, Moon, Sun, Monitor, Import, Shield, List, HelpCircle, CreditCard, Clock, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import HelpWidget from './HelpWidget';

import NotificationPopover from './NotificationPopover';

const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const renderThemeIcon = () => {
    if (theme === 'light') return <Sun size={18} className="text-yellow-500" />;
    if (theme === 'dark') return <Moon size={18} className="text-blue-400" />;
    return <Monitor size={18} className="text-gray-500 dark:text-gray-400" />;
  };

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: t('menu.dashboard'), roles: ['admin', 'staff', 'teacher', 'student', 'super_admin'] },
    { path: '/schedule', icon: <Calendar size={20} />, label: user?.role === 'teacher' ? t('menu.teachingSchedule') : (user?.role === 'student' ? t('menu.learningSchedule') : t('menu.schedule')), roles: ['admin', 'staff', 'teacher', 'student', 'super_admin'] },
    { path: '/classes', icon: <BookOpen size={20} />, label: t('menu.classes'), roles: ['admin', 'staff', 'teacher', 'super_admin'] },
    { path: '/students', icon: <Users size={20} />, label: t('menu.students'), roles: ['admin', 'staff', 'super_admin'] },
    { path: '/teachers', icon: <Users size={20} />, label: t('menu.teachers'), roles: ['admin', 'staff', 'super_admin'] },
    { path: '/rooms', icon: <DoorOpen size={20} />, label: t('menu.rooms'), roles: ['admin', 'staff', 'super_admin'] },
    { path: '/branches', icon: <Building size={20} />, label: t('menu.branches'), roles: ['admin', 'staff', 'super_admin'], isPremium: true },
    { path: '/import', icon: <Import size={20} />, label: t('menu.import'), roles: ['admin', 'staff', 'super_admin'] },
    { path: '/help', icon: <HelpCircle size={20} />, label: t('menu.help'), roles: ['admin', 'staff', 'teacher', 'student', 'super_admin'] },
    { path: '/subscription', icon: <CreditCard size={20} />, label: t('menu.subscription'), roles: ['admin', 'super_admin'] },
    { path: '/settings', icon: <Settings size={20} />, label: t('menu.settings'), roles: ['admin', 'super_admin'] },
    { path: '/admin/tenants', icon: <Shield size={20} />, label: t('menu.adminTenants'), roles: ['super_admin'] },
    { path: '/admin/requests', icon: <Clock size={20} />, label: t('menu.planRequests'), roles: ['super_admin'] },
    { path: '/admin/plans', icon: <List size={20} />, label: t('menu.adminPlans'), roles: ['super_admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => user?.role && item.roles.includes(user.role));

  const currentMenu = visibleMenuItems.find(m => location.pathname.startsWith(m.path))?.label || 'EduSchedule';

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans overflow-hidden transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 z-[60] md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-[70] w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-xl shadow-lg shadow-primary/20 object-cover shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent tracking-tight leading-tight truncate">
                EduSchedule
              </h1>
              <div className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] truncate">{user?.tenant_name || 'Premium Edition'}</div>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all shrink-0"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>
                    {item.icon}
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {item.isPremium && (
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
                      <Zap size={10} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-inner shrink-0">
                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-8 shadow-sm z-40 shrink-0 transition-colors duration-200">
          <div className="flex items-center min-w-0 mr-4">
            <button
              className="mr-3 md:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white truncate tracking-tight">{currentMenu}</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationPopover />
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title={t('helpWidget.title')}
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={cycleTheme}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title={`Theme: ${theme}`}
            >
              {renderThemeIcon()}
            </button>
            <button
              onClick={toggleLanguage}
              className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title="Toggle Language"
            >
              <Globe size={18} />
              <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-[7px] font-black text-primary dark:text-blue-400 shadow-sm leading-none uppercase tracking-tighter">
                {i18n.language.startsWith('en') ? 'EN' : 'VI'}
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-3 md:p-8 overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
          <Outlet />
        </div>
        <HelpWidget isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </main>
    </div>
  );
};

export default MainLayout;
