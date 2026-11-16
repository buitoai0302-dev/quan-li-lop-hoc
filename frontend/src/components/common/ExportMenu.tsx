import React, { useId, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2, Upload } from 'lucide-react';
import ActionHint from './ActionHint';

const VIEWPORT_PADDING = 8;
const TRIGGER_GAP = 6;

interface ExportMenuProps {
  onExportExcel: () => void | Promise<void>;
  onExportPDF: () => void | Promise<void>;
  onImport?: () => void;
  inlineLabel?: boolean;
  disabled?: boolean;
  align?: 'left' | 'right' | 'responsive';
}

const ExportMenu: React.FC<ExportMenuProps> = ({
  onExportExcel,
  onExportPDF,
  onImport,
  inlineLabel,
  disabled,
  align = 'right',
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusLastItemRef = useRef(false);
  const menuId = useId();
  const triggerId = useId();

  const closeMenu = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const items = dropdownRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    const item = focusLastItemRef.current ? items?.[items.length - 1] : items?.[0];
    (item || dropdownRef.current)?.focus();
    focusLastItemRef.current = false;
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const dropdown = dropdownRef.current;
    if (!open || !button || !dropdown) return;

    const updatePosition = () => {
      const rect = button.getBoundingClientRect();
      const viewport = document.documentElement;
      const width = dropdown.offsetWidth;
      const height = dropdown.offsetHeight;
      const rightAligned = rect.right - width;
      const left =
        align === 'left' || (align === 'responsive' && rightAligned < VIEWPORT_PADDING)
          ? rect.left
          : rightAligned;
      const below = rect.bottom + TRIGGER_GAP;
      const above = rect.top - TRIGGER_GAP - height;
      const openAbove =
        below + height > viewport.clientHeight - VIEWPORT_PADDING && above >= VIEWPORT_PADDING;
      const top = openAbove ? above : below;

      dropdown.style.setProperty('--menu-enter-offset', openAbove ? '4px' : '-4px');
      dropdown.style.left = `${Math.max(VIEWPORT_PADDING, Math.min(left, viewport.clientWidth - width - VIEWPORT_PADDING))}px`;
      dropdown.style.top = `${Math.max(VIEWPORT_PADDING, Math.min(top, viewport.clientHeight - height - VIEWPORT_PADDING))}px`;
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [align, open, t]);

  const handleExport = async (type: 'excel' | 'pdf') => {
    closeMenu();
    setLoading(type);
    try {
      if (type === 'excel') await onExportExcel();
      else await onExportPDF();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Button — same style as other toolbar buttons */}
      <ActionHint label={t(onImport ? 'common.actions' : 'export.button')} showTouchLabel={false}>
        <button
          ref={buttonRef}
          id={triggerId}
          type="button"
          aria-label={t(
            loading ? 'export.exporting' : onImport ? 'common.actions' : 'export.button'
          )}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            focusLastItemRef.current = event.key === 'ArrowUp';
            setOpen(true);
          }}
          disabled={(disabled && !onImport) || loading !== null}
          className={`h-11 ${inlineLabel || onImport ? 'px-2.5' : 'w-11'} sm:h-9 sm:w-auto sm:px-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold border border-gray-100 dark:border-gray-700 whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <Loader2 size={14} className="motion-safe:animate-spin" />
          ) : (
            !onImport && <Download size={14} />
          )}
          {(inlineLabel || onImport) && (
            <span className="sm:hidden">
              {t(onImport ? 'common.actions' : 'export.buttonShort')}
            </span>
          )}
          <span className="hidden sm:inline">
            {loading ? t('export.exporting') : t(onImport ? 'common.actions' : 'export.button')}
          </span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </ActionHint>

      {/* Dropdown rendered in Portal to escape overflow-hidden/auto containers */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={menuId}
            ref={dropdownRef}
            role="menu"
            aria-labelledby={triggerId}
            tabIndex={-1}
            onBlur={(event) => {
              if (
                event.relatedTarget !== buttonRef.current &&
                !event.currentTarget.contains(event.relatedTarget)
              )
                setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Tab') {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                }
                closeMenu();
                return;
              }
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
              );
              const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
              let nextIndex: number;
              if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
              else if (event.key === 'ArrowUp')
                nextIndex = (currentIndex - 1 + items.length) % items.length;
              else if (event.key === 'Home') nextIndex = 0;
              else if (event.key === 'End') nextIndex = items.length - 1;
              else return;
              event.preventDefault();
              items[nextIndex]?.focus();
            }}
            className="menu-enter fixed z-[9999] w-52 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            {onImport && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  closeMenu();
                  onImport();
                }}
                className="flex min-h-11 w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                <Upload aria-hidden="true" size={16} />
                {t('common.import')}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => handleExport('excel')}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              <FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />
              {t('export.excel')}
            </button>
            <div className="h-px bg-gray-100 dark:bg-slate-700" />
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              <FileText size={16} className="text-red-500 shrink-0" />
              {t('export.pdf')}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ExportMenu;
