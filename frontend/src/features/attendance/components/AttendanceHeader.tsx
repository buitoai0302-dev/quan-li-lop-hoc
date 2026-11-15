import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Calendar as CalendarIcon,
  CheckCircle,
  Save,
  Undo2,
  ArrowRight,
} from 'lucide-react';
import type { Session, AttendanceRecord } from '../types';
import ExportMenu from '@/components/common/ExportMenu';

interface AttendanceHeaderProps {
  selectedSession: Session | null;
  attendance: AttendanceRecord[];
  saving: boolean;
  isReadOnly: boolean;
  isFutureDate: boolean;
  handleMarkAllAsPresent: () => void;
  handleSave: () => void;
  handleSaveNext: () => void;
  handleUndo: () => void;
  canUndo: boolean;
  unmarkedCount: number;
  onExportExcel: () => void | Promise<void>;
  onExportPDF: () => void | Promise<void>;
}

const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({
  selectedSession,
  attendance,
  saving,
  isReadOnly,
  isFutureDate,
  handleMarkAllAsPresent,
  handleSave,
  handleSaveNext,
  handleUndo,
  canUndo,
  unmarkedCount,
  onExportExcel,
  onExportPDF,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {selectedSession && (
        <ExportMenu
          onExportExcel={onExportExcel}
          onExportPDF={onExportPDF}
          disabled={attendance.length === 0}
          align="responsive"
          inlineLabel
        />
      )}
      {!selectedSession ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800/50">
          <CalendarIcon size={14} />
          {t('attendance.selectSession')}
        </div>
      ) : isFutureDate ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium border border-amber-100 dark:border-amber-800/50">
          <CalendarIcon size={14} />
          {t('attendance.futureSessionWarning')}
        </div>
      ) : isReadOnly ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800/50">
          <ClipboardCheck size={14} />
          {t('attendance.pastSessionWarning')}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllAsPresent}
            disabled={saving || unmarkedCount === 0}
            className="inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold text-xs hover:bg-emerald-800 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <CheckCircle size={14} />
            <span>{t('attendance.markUnmarked', { count: unmarkedCount })}</span>
          </button>
          {canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={saving}
              aria-label={t('attendance.undo')}
              title={t('attendance.undo')}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600"
            >
              <Undo2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || attendance.length === 0}
            className="inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full motion-safe:animate-spin"></div>
            ) : (
              <Save size={14} />
            )}
            {t('common.save')}
          </button>
          <button
            type="button"
            onClick={handleSaveNext}
            disabled={saving || attendance.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary px-3 text-xs font-semibold text-primary disabled:opacity-50"
          >
            {t('attendance.saveNext')}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceHeader;
