import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';

interface ExportMenuProps {
  onExportExcel: () => void | Promise<void>;
  onExportPDF: () => void | Promise<void>;
  disabled?: boolean;
  align?: 'left' | 'right' | 'responsive';
}

const ExportMenu: React.FC<ExportMenuProps> = ({
  onExportExcel,
  onExportPDF,
  disabled,
  align = 'right',
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExport = async (type: 'excel' | 'pdf') => {
    setLoading(type);
    setOpen(false);
    try {
      if (type === 'excel') await onExportExcel();
      else await onExportPDF();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Button — same style as other toolbar buttons */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || loading !== null}
        className="h-9 px-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 dark:border-gray-700 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        <span className="hidden sm:inline">
          {loading ? t('export.exporting') : t('export.button')}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — high z-index to stay above sticky headers / modals */}
      {open && (
        <div
          className={`absolute top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
            align === 'left'
              ? 'left-0'
              : align === 'responsive'
                ? 'left-0 sm:auto sm:right-0'
                : 'right-0'
          }`}
        >
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />
            {t('export.excel')}
          </button>
          <div className="h-px bg-gray-100 dark:bg-slate-700" />
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 transition-colors"
          >
            <FileText size={16} className="text-red-500 shrink-0" />
            {t('export.pdf')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
