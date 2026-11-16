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
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {unmarkedCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsPresent}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950/40 sm:min-h-9"
            >
              <CheckCircle size={14} />
              <span>{t('attendance.markUnmarked', { count: unmarkedCount })}</span>
            </button>
          )}
          {canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={saving}
              aria-label={t('attendance.undo')}
              title={t('attendance.undo')}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-300 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-600 sm:size-9"
            >
              <Undo2 size={16} />
            </button>
          )}
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || attendance.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 sm:min-h-9"
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
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:min-h-9 sm:px-3"
            >
              {t('attendance.saveNext')}
              <ArrowRight size={14} aria-hidden="true" className="hidden sm:inline" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHeader;
