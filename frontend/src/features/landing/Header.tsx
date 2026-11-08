import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { usePublicSettings } from '@/features/admin/hooks/useSystemSettings';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: settings } = usePublicSettings();
  const brand = settings?.SYSTEM_NAME?.trim() || 'EduSchedule';
  const isLanding = useLocation().pathname === ROUTES.HOME;
  const nav = [
    { href: isLanding ? '#features' : '/#features', label: t('landing.featuresLabel') },
    { href: isLanding ? '#pricing' : '/#pricing', label: t('landing.pricingLabel') },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 font-black text-slate-900 dark:text-white"
        >
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl" />
          <span className="truncate text-base sm:text-xl">{brand}</span>
        </Link>
        <nav
          aria-label={t('landing.navigation', 'Điều hướng')}
          className="hidden items-center gap-6 md:flex"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-200"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('en') ? 'vi' : 'en')}
            aria-label={t('landing.switchLanguage', 'Đổi ngôn ngữ')}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Globe size={17} />
            <span className="text-xs">{i18n.language.startsWith('en') ? 'EN' : 'VI'}</span>
          </button>
          <Link
            to={ROUTES.LOGIN}
            className="hidden rounded-lg px-3 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 sm:inline-flex"
          >
            {t('landing.login')}
          </Link>
          <Link
            to={ROUTES.REGISTER}
            className="hidden rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white sm:inline-flex"
          >
            {t('landing.register')}
          </Link>
          <button
            type="button"
            aria-label={
              open ? t('landing.closeMenu', 'Đóng menu') : t('landing.openMenu', 'Mở menu')
            }
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-800 dark:text-white md:hidden"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          aria-label={t('landing.mobileNavigation', 'Điều hướng di động')}
          className="grid gap-1 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:hidden"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 font-semibold text-slate-800 dark:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link
            to={ROUTES.LOGIN}
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 font-semibold text-slate-800 dark:text-white"
          >
            {t('landing.login')}
          </Link>
          <Link
            to={ROUTES.REGISTER}
            onClick={() => setOpen(false)}
            className="rounded-lg bg-indigo-600 px-3 py-3 font-semibold text-white"
          >
            {t('landing.register')}
          </Link>
        </nav>
      )}
    </header>
  );
};
export default Header;
