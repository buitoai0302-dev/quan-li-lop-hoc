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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800/50 shrink-0 transition-all duration-300 relative z-[60]">
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 p-3 sm:p-4 bg-gray-50/30 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800/50 rounded-t-xl">
        {/* Left: Title (Clickable) */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0 lg:flex-1"
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
        >
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <ClipboardCheck size={14} />
          </div>
          <h3 className="hidden md:block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {t('attendance.stats')}
          </h3>
        </div>

        {/* Middle: Filters (Date + Search) */}
        <div
          className="flex flex-1 flex-col xl:flex-row items-center justify-center gap-2 sm:gap-3 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none sm:w-56 min-w-0">
              <button
                onClick={handlePrevDay}
                className="p-1.5 sm:p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 shrink-0 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft size={16} />
              </button>
              <div
                className="relative flex-1 group cursor-pointer min-w-0"
                onClick={() => {
                  const input = dateInputRef.current as HTMLInputElement;
                  if (input) {
                    if (typeof (input as any).showPicker === 'function') {
                      (input as any).showPicker();
                    } else {
                      input.click();
                    }
                  }
                }}
              >
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`w-full pl-7 sm:pl-8 pr-1 sm:pr-2 py-1.5 sm:py-2 ${
                    isFutureDate
                      ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 focus:ring-amber-500/20'
                      : isReadOnly
                        ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 focus:ring-blue-500/20'
                        : 'bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700 focus:ring-primary/20'
                  } border rounded-lg text-[10px] sm:text-xs font-bold outline-none dark:text-white cursor-pointer truncate`}
                />
                <CalendarIcon
                  size={12}
                  className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 ${
                    isFutureDate
                      ? 'text-amber-500'
                      : isReadOnly
                        ? 'text-blue-500'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'
                  } transition-colors`}
                />
              </div>
              <button
                onClick={handleNextDay}
                className="p-1.5 sm:p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 shrink-0 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/5 dark:bg-primary/10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary rounded-lg border border-primary/10 hover:bg-primary/10 transition-all active:scale-95 shrink-0"
            >
              {t('common.today')}
            </button>
          </div>

          <div
            className={`relative flex-1 w-full min-w-[150px] max-w-sm transition-opacity ${!selectedSession ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!selectedSession}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Right: Actions + Chevron toggle */}
        <div className="flex items-center gap-2 shrink-0 w-full lg:flex-1 justify-end">
          {headerActions}
          <button
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="p-1.5 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-gray-200 dark:border-slate-700 rounded-lg transition-all active:scale-95 shadow-sm shrink-0"
          >
            {isControlsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${isControlsExpanded ? 'max-h-[500px] opacity-100 border-t border-gray-50 dark:border-slate-800/50 p-3 sm:p-4' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        {selectedSession && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
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
        )}
      </div>
    </div>
  );
};

export default AttendanceControls;
