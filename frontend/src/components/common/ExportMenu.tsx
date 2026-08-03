import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';

interface ExportMenuProps {
  onExportExcel: () => void | Promise<void>;
  onExportPDF: () => void | Promise<void>;
  disabled?: boolean;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ onExportExcel, onExportPDF, disabled }) => {
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
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || loading !== null}
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin text-primary" />
        ) : (
          <Download size={15} />
        )}
        <span className="hidden sm:inline">
          {loading ? t('export.exporting') : t('export.button')}
        </span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />
            {t('export.excel')}
          </button>
          <div className="h-px bg-gray-50 dark:bg-slate-700" />
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
