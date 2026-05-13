import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, Calendar as CalendarIcon, CheckCircle, Save } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import type { Session, AttendanceRecord } from '../types';

interface AttendanceHeaderProps {
  selectedSession: Session | null;
  attendance: AttendanceRecord[];
  saving: boolean;
  isReadOnly: boolean;
  isFutureDate: boolean;
  handleMarkAllAsPresent: () => void;
  handleSave: () => void;
}

const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({
  selectedSession,
  attendance,
  saving,
  isReadOnly,
  isFutureDate,
  handleMarkAllAsPresent,
  handleSave,
}) => {
  const { t } = useTranslation();

  return (
    <PageHeader
      icon={ClipboardCheck}
      actions={
        <div className="flex items-center gap-2">
          {!selectedSession ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800/50">
              <CalendarIcon size={14} />
              {t('attendance.selectSession')}
            </div>
          ) : isFutureDate ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-800/50">
              <CalendarIcon size={14} />
              {t('attendance.futureSessionWarning')}
            </div>
          ) : isReadOnly ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800/50">
              <ClipboardCheck size={14} />
              {t('attendance.pastSessionWarning')}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllAsPresent}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95 whitespace-nowrap"
              >
                <CheckCircle size={14} />
                <span className="hidden sm:inline">{t('attendance.quickMarkAll')}</span>
                <span className="sm:hidden">{t('attendance.present')}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || attendance.length === 0}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save size={14} />
                )}
                {t('common.save')}
              </button>
            </div>
          )}
        </div>
      }
    />
  );
};

export default AttendanceHeader;
