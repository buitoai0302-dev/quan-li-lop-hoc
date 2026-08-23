import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('en') ? 'vi' : 'en');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-800/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="EduSchedule Logo"
              className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20"
            />
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              EduSchedule
            </span>
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-bold text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              {t('landing.features', 'Features')}
            </a>
            <a
              href="#pricing"
              className="text-sm font-bold text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              {t('landing.pricing', 'Pricing')}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="group flex items-center justify-center gap-1.5 px-3 h-10 text-sm font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white bg-slate-50 hover:bg-primary/5 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
              title={i18n.language.startsWith('en') ? 'Tiếng Việt' : 'English'}
            >
              <Globe size={16} className="group-hover:rotate-12 transition-transform" />
              <span>{i18n.language.startsWith('en') ? 'EN' : 'VI'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-3">
              <Link
                to={ROUTES.LOGIN}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-white transition-colors"
              >
                {t('landing.login', 'Login')}
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="px-6 py-2.5 text-sm font-black text-white bg-primary hover:bg-primary-600 rounded-xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {t('landing.register', 'Register')}
              </Link>
            </div>

            {/* Mobile Menu Button - Optional, keeping it simple for now */}
            <div className="sm:hidden flex items-center">
              <Link
                to={ROUTES.LOGIN}
                className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md"
              >
                {t('landing.login', 'Login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
