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
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800/50 shrink-0 overflow-hidden transition-all duration-300">
      <div
        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors"
        onClick={() => setIsControlsExpanded(!isControlsExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <ClipboardCheck size={14} />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('attendance.stats')} & {t('common.filter')}
          </h3>
        </div>
        <button className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-all active:scale-95">
          {isControlsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${isControlsExpanded ? 'max-h-[500px] opacity-100 border-t border-gray-50 dark:border-slate-800/50 p-3 sm:p-4' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        {selectedSession && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="bg-green-50/50 dark:bg-green-900/10 p-2 lg:p-3 rounded-lg border border-green-100 dark:border-green-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-0.5">
                {t('attendance.present')}
              </div>
              <div className="text-base lg:text-xl font-black text-green-600">
                {stats.present}{' '}
                <span className="text-[10px] font-medium text-green-400">/ {stats.total}</span>
              </div>
            </div>
            <div className="bg-red-50/50 dark:bg-red-900/10 p-2 lg:p-3 rounded-lg border border-red-100 dark:border-red-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-red-600/60 uppercase tracking-widest mb-0.5">
                {t('attendance.absent')}
              </div>
              <div className="text-base lg:text-xl font-black text-red-600">{stats.absent}</div>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-2 lg:p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-0.5">
                {t('attendance.late')}
              </div>
              <div className="text-base lg:text-xl font-black text-amber-600">{stats.late}</div>
            </div>
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 lg:p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-0.5">
                {t('attendance.excused')}
              </div>
              <div className="text-base lg:text-xl font-black text-blue-600">{stats.excused}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="flex items-center gap-1.5 flex-1 md:flex-none md:w-64 min-w-0">
              <button
                onClick={handlePrevDay}
                className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 shrink-0 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft size={16} />
              </button>
              <div
                className="relative flex-1 group cursor-pointer min-w-0"
                onClick={() => {
                  const input = dateInputRef.current as any;
                  if (input) {
                    if ('showPicker' in input) input.showPicker();
                    else input.click();
                  }
                }}
              >
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 ${
                    isFutureDate
                      ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 focus:ring-amber-500/20'
                      : isReadOnly
                        ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 focus:ring-blue-500/20'
                        : 'bg-gray-50 dark:bg-slate-950 border-gray-100 dark:border-slate-800 focus:ring-primary/20'
                  } border rounded-lg text-[10px] sm:text-xs font-bold outline-none dark:text-white cursor-pointer truncate`}
                />
                <CalendarIcon
                  size={12}
                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
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
                className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 shrink-0 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="px-3 sm:px-4 py-2 bg-primary/5 dark:bg-primary/10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary rounded-lg border border-primary/10 hover:bg-primary/10 transition-all active:scale-95 shrink-0"
            >
              {t('common.today')}
            </button>
          </div>

          {selectedSession && (
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceControls;
