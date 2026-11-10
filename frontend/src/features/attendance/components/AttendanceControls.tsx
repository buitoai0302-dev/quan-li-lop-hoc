import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
} from 'lucide-react';
import type { AttendanceStats, Session } from '../types';
import { ATTENDANCE_STATUS } from '@/utils/constants';

interface AttendanceControlsProps {
  isControlsExpanded: boolean;
  setIsControlsExpanded: (v: boolean) => void;
  selectedSession: Session | null;
  stats: AttendanceStats;
  selectedDate: string;
  isReadOnly: boolean;
  isFutureDate: boolean;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleToday: () => void;
  handleDateChange: (d: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  dateInputRef: React.RefObject<HTMLInputElement | null>;
  headerActions?: React.ReactNode;
}

const AttendanceControls: React.FC<AttendanceControlsProps> = ({
  isControlsExpanded,
  setIsControlsExpanded,
  selectedSession,
  stats,
  selectedDate,
  isReadOnly,
  isFutureDate,
  handlePrevDay,
  handleNextDay,
  handleToday,
  handleDateChange,
  searchTerm,
  setSearchTerm,
  dateInputRef,
  headerActions,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative z-[60] shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <button
            type="button"
            onClick={handlePrevDay}
            aria-label={t('common.previous')}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:size-9"
          >
            <ChevronLeft aria-hidden="true" size={16} />
          </button>
          <div className="relative min-w-0 flex-1 sm:w-36 sm:flex-none">
            <input
              ref={dateInputRef}
              type="date"
              aria-label={t('schedule.selectDate')}
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className={`h-11 w-full min-w-0 cursor-pointer rounded-lg border pl-7 pr-1 text-xs font-semibold tabular-nums text-slate-900 focus-visible:outline-2 focus-visible:outline-primary dark:text-white sm:h-9 ${
                isFutureDate
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'
                  : isReadOnly
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
              }`}
            />
            <CalendarIcon
              aria-hidden="true"
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={handleNextDay}
            aria-label={t('common.next')}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:size-9"
          >
            <ChevronRight aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="min-h-11 shrink-0 rounded-lg bg-primary/10 px-2.5 text-xs font-semibold text-indigo-700 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary dark:text-indigo-200 sm:min-h-9"
          >
            {t('common.today')}
          </button>
        </div>

        {selectedSession && (
          <div className="relative w-full sm:min-w-40 sm:max-w-sm sm:flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
              size={14}
            />
            <input
              type="search"
              aria-label={t('common.search')}
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400 sm:h-9 sm:text-xs"
            />
          </div>
        )}

        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          {headerActions}
          {selectedSession && (
            <button
              type="button"
              onClick={() => setIsControlsExpanded(!isControlsExpanded)}
              aria-expanded={isControlsExpanded}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:min-h-9"
            >
              <ClipboardCheck aria-hidden="true" size={15} />
              {t('attendance.stats')}
              {isControlsExpanded ? (
                <ChevronUp aria-hidden="true" size={14} />
              ) : (
                <ChevronDown aria-hidden="true" size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {selectedSession && isControlsExpanded && (
        <div className="filter-enter border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              {
                key: ATTENDANCE_STATUS.PRESENT,
                bgColor: 'bg-green-50/50 dark:bg-green-900/10',
                borderColor: 'border-green-100 dark:border-green-800/30',
                textColor: 'text-green-600',
                labelColor: 'text-green-600/60',
                totalColor: 'text-green-400',
                value: stats.present,
                showTotal: true,
              },
              {
                key: ATTENDANCE_STATUS.ABSENT,
                bgColor: 'bg-red-50/50 dark:bg-red-900/10',
                borderColor: 'border-red-100 dark:border-red-800/30',
                textColor: 'text-red-600',
                labelColor: 'text-red-600/60',
                value: stats.absent,
              },
              {
                key: ATTENDANCE_STATUS.LATE,
                bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
                borderColor: 'border-amber-100 dark:border-amber-800/30',
                textColor: 'text-amber-600',
                labelColor: 'text-amber-600/60',
                value: stats.late,
              },
              {
                key: ATTENDANCE_STATUS.EXCUSED,
                bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
                borderColor: 'border-blue-100 dark:border-blue-800/30',
                textColor: 'text-blue-600',
                labelColor: 'text-blue-600/60',
                value: stats.excused,
              },
            ].map(
              ({
                key,
                bgColor,
                borderColor,
                textColor,
                labelColor,
                totalColor,
                value,
                showTotal,
              }) => (
                <div key={key} className={`${bgColor} ${borderColor} p-2 lg:p-3 rounded-lg border`}>
                  <div
                    className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest mb-0.5 ${labelColor}`}
                  >
                    {t(`attendance.${key}`)}
                  </div>
                  <div className={`text-base lg:text-xl font-black ${textColor}`}>
                    {value}
                    {showTotal && (
                      <span className={`text-[10px] font-medium ml-1 ${totalColor}`}>
                        / {stats.total}
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceControls;
