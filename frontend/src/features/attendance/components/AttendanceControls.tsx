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
  viewActions?: React.ReactNode;
  sessionActions?: React.ReactNode;
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
  viewActions,
  sessionActions,
  headerActions,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative z-[60] shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
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
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-[21rem] sm:flex-1">
            <div className="relative min-w-0 flex-1">
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

            <div className="flex shrink-0 items-center gap-2">
              {viewActions}
              <button
                type="button"
                onClick={() => setIsControlsExpanded(!isControlsExpanded)}
                aria-expanded={isControlsExpanded}
                aria-label={t('attendance.stats')}
                title={t('attendance.stats')}
                className="inline-flex size-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary aria-expanded:border-primary/35 aria-expanded:bg-primary/5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-9 sm:w-auto sm:px-2.5"
              >
                <ClipboardCheck aria-hidden="true" size={15} />
                <span className="hidden sm:inline">{t('attendance.stats')}</span>
                {isControlsExpanded ? (
                  <ChevronUp aria-hidden="true" size={14} className="hidden sm:inline" />
                ) : (
                  <ChevronDown aria-hidden="true" size={14} className="hidden sm:inline" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        {sessionActions}
        {headerActions}
      </div>

      {selectedSession && isControlsExpanded && (
        <div className="filter-enter border-t border-slate-200 px-3 py-2.5 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              {
                key: ATTENDANCE_STATUS.PRESENT,
                bgColor: 'bg-green-50/50 dark:bg-green-900/10',
                borderColor: 'border-green-100 dark:border-green-800/30',
                textColor: 'text-green-700 dark:text-green-300',
                labelColor: 'text-green-800 dark:text-green-200',
                totalColor: 'text-green-700 dark:text-green-300',
                value: stats.present,
                showTotal: true,
              },
              {
                key: ATTENDANCE_STATUS.ABSENT,
                bgColor: 'bg-red-50/50 dark:bg-red-900/10',
                borderColor: 'border-red-100 dark:border-red-800/30',
                textColor: 'text-red-700 dark:text-red-300',
                labelColor: 'text-red-800 dark:text-red-200',
                value: stats.absent,
              },
              {
                key: ATTENDANCE_STATUS.LATE,
                bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
                borderColor: 'border-amber-100 dark:border-amber-800/30',
                textColor: 'text-amber-700 dark:text-amber-300',
                labelColor: 'text-amber-800 dark:text-amber-200',
                value: stats.late,
              },
              {
                key: ATTENDANCE_STATUS.EXCUSED,
                bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
                borderColor: 'border-blue-100 dark:border-blue-800/30',
                textColor: 'text-blue-700 dark:text-blue-300',
                labelColor: 'text-blue-800 dark:text-blue-200',
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
                <div
                  key={key}
                  className={`${bgColor} ${borderColor} flex flex-wrap items-center justify-between gap-x-2 rounded-lg border px-2.5 py-1.5 sm:px-3`}
                >
                  <div className={`text-xs font-semibold ${labelColor}`}>
                    {t(`attendance.${key}`)}
                  </div>
                  <div className={`text-base font-bold tabular-nums ${textColor}`}>
                    {value}
                    {showTotal && (
                      <span className={`text-xs font-medium ml-1 ${totalColor}`}>
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
