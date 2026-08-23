import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Globe, Moon, Sun, Monitor, HelpCircle, MessageSquarePlus } from 'lucide-react';
import { getMenuItems } from '../routes';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import HelpWidget from './HelpWidget';
import NotificationPopover from './NotificationPopover';
import Sidebar from './Sidebar';
import FeedbackModal from './FeedbackModal';
import { useFCM } from '@/features/notifications/hooks/useFCM';

const MainLayout: React.FC = () => {
  useFCM(); // Initialize FCM notifications
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleOpenFeedback = () => setIsFeedbackOpen(true);
    window.addEventListener('open-feedback-modal', handleOpenFeedback);
    return () => window.removeEventListener('open-feedback-modal', handleOpenFeedback);
  }, []);

  const handleLogout = () => {
    logout();
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

  // Centralized Menu Items
  const menuItems = getMenuItems(t, user?.role);

  // Flatten the groups to find the active menu item
  const allMenuItems = menuItems.flatMap((group) => group.items);
  const currentMenu =
    allMenuItems.find((m: { path: string; label?: string }) =>
      m.path === '/' ? location.pathname === '/' : location.pathname.startsWith(m.path)
    )?.label || t('common.appName');

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-200">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative custom-scrollbar bg-gray-50/50 dark:bg-slate-950/50">
        {/* Impersonation Banner */}
        {localStorage.getItem('impersonatedTenantId') && (
          <div className="w-full z-[100] bg-rose-500 text-white px-4 py-2 flex items-center justify-center gap-4 text-xs font-bold shadow-md shrink-0">
            <span>
              {t('common.managingTenant')}{' '}
              {localStorage.getItem('impersonatedTenantName') || t('common.unknown')}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('impersonatedTenantId');
                localStorage.removeItem('impersonatedTenantName');
                window.location.href = '/';
              }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors uppercase tracking-widest text-[10px]"
            >
              {t('common.exit')}
            </button>
          </div>
        )}

        <header className="sticky top-0 z-[70] h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shadow-sm transition-colors duration-200 shrink-0 will-change-transform">
          <div className="flex items-center min-w-0 mr-4">
            <button
              className="mr-3 md:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white truncate tracking-tight">
              {currentMenu}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationPopover />
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title={t('common.feedback')}
            >
              <MessageSquarePlus size={18} />
            </button>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title={t('helpWidget.title')}
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={cycleTheme}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title={`Theme: ${theme}`}
            >
              {renderThemeIcon()}
            </button>
            <button
              onClick={toggleLanguage}
              className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              title="Toggle Language"
            >
              <Globe size={18} />
              <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-[7px] font-black text-primary dark:text-blue-400 shadow-sm leading-none uppercase tracking-tighter">
                {i18n.language.startsWith('en') ? 'EN' : 'VI'}
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-3 md:p-5 flex flex-col">
          <Outlet />
        </div>
        <HelpWidget isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      </main>
    </div>
  );
};

export default MainLayout;
