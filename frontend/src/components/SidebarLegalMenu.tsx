import { useEffect, useId, useRef, useState } from 'react';
import { ChevronUp, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/utils/constants';

interface SidebarLegalMenuProps {
  onNavigate: () => void;
}

export default function SidebarLegalMenu({ onNavigate }: SidebarLegalMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const dismissOnResize = () => setIsOpen(false);
    document.addEventListener('pointerdown', dismissOutside);
    window.addEventListener('resize', dismissOnResize);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('resize', dismissOnResize);
    };
  }, [isOpen]);

  const handleNavigate = () => {
    setIsOpen(false);
    onNavigate();
  };

  return (
    <div
      ref={containerRef}
      className="relative mb-1 flex justify-center"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (isOpen && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 pointer-coarse:min-h-11"
      >
        <ShieldCheck size={13} aria-hidden="true" />
        {t('legal.policies')}
        <ChevronUp size={12} aria-hidden="true" />
      </button>
      {isOpen && (
        <nav
          id={menuId}
          aria-label={t('legal.policies')}
          className="menu-enter absolute inset-x-0 bottom-full z-20 mb-1 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-lg [--menu-enter-offset:4px] dark:border-slate-700 dark:bg-slate-900"
        >
          <Link
            to={ROUTES.PRIVACY}
            onClick={handleNavigate}
            className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ShieldCheck size={15} aria-hidden="true" className="shrink-0" />
            {t('landing.privacy')}
          </Link>
          <Link
            to={ROUTES.TERMS}
            onClick={handleNavigate}
            className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileText size={15} aria-hidden="true" className="shrink-0" />
            {t('landing.terms')}
          </Link>
        </nav>
      )}
    </div>
  );
}
