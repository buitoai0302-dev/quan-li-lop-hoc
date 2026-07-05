import React from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Plus,
  MapPin,
  User,
  BookOpen,
} from 'lucide-react';
import { USER_ROLES, VIEW_MODES } from '@/utils/constants';
import { Button, Select, Label } from '@/components/common/UI';
import type { ScheduleHeaderProps } from '@/types';

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  branches,
  selectedBranch,
  setSelectedBranch,
  teachers,
  selectedTeacher,
  setSelectedTeacher,
  classes,
  selectedClass,
  setSelectedClass,
  isFilterVisible,
  setIsFilterVisible,
  canEdit,
  onAddSession,
  onPrev,
  onNext,
  currentLocale,
  user,
  t,
}) => {
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else {
      if (viewMode === VIEW_MODES.DAY) setSelectedDate(addDays(selectedDate, -1));
      else if (viewMode === VIEW_MODES.WEEK) setSelectedDate(addDays(selectedDate, -7));
      else setSelectedDate(addDays(selectedDate, -30));
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      if (viewMode === VIEW_MODES.DAY) setSelectedDate(addDays(selectedDate, 1));
      else if (viewMode === VIEW_MODES.WEEK) setSelectedDate(addDays(selectedDate, 7));
      else setSelectedDate(addDays(selectedDate, 30));
    }
  };

  const handleShowPicker = () => {
    const input = dateInputRef.current as any;
    if (input) {
      if ('showPicker' in input) input.showPicker();
      else input.click();
    }
  };

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-surface dark:bg-gray-900 transition-all sticky top-0 z-30 shadow-sm">
      {/* Main Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between px-3 sm:px-4 py-3 sm:py-4 gap-4">
        {/* Left Side: Title */}
        <div className="flex items-center flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3 truncate">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Calendar size={20} className="text-primary" />
            </div>
            <span className="truncate">
              {viewMode === VIEW_MODES.DAY && format(selectedDate, 'dd/MM/yyyy')}
              {viewMode === VIEW_MODES.WEEK && (
                <span className="flex items-center gap-2 text-primary">
                  <span>{format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd/MM')}</span>
                  <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>
                  <span>
                    {format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), 'dd/MM')}
                  </span>
                </span>
              )}
              {viewMode === VIEW_MODES.MONTH &&
                format(selectedDate, 'MMMM yyyy', { locale: currentLocale as any })}
            </span>
          </h1>
        </div>

        {/* Center: Date Navigation */}
        <div className="flex items-center justify-start lg:justify-center flex-none">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 shadow-inner border border-gray-200/20 dark:border-gray-700/30">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white dark:hover:bg-gray-700 rounded-lg"
              onClick={handlePrev}
            >
              <ChevronLeft size={16} />
            </Button>
            <div
              className="relative flex items-center bg-white dark:bg-gray-700 px-4 py-1.5 rounded-lg mx-1 border border-gray-200/50 dark:border-gray-600/50 cursor-pointer shadow-sm hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={handleShowPicker}
            >
              <span className="text-[11px] font-black text-gray-700 dark:text-gray-200 w-24 text-center">
                {format(selectedDate, 'dd/MM/yyyy')}
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Calendar size={14} className="text-primary ml-1" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white dark:hover:bg-gray-700 rounded-lg"
              onClick={handleNext}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Right Side: Switcher + Actions */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex flex-1 sm:flex-none p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl shadow-inner border border-gray-200/50 dark:border-gray-700/50 isolate">
            <div
              className="absolute top-1 bottom-1 w-[calc(33.333%-0.15rem)] bg-white dark:bg-gray-600 rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-out z-[-1]"
              style={{
                left: '0.25rem',
                transform: `translateX(${
                  viewMode === VIEW_MODES.DAY ? '0' : viewMode === VIEW_MODES.WEEK ? '100%' : '200%'
                })`,
              }}
            />
            {([VIEW_MODES.DAY, VIEW_MODES.WEEK, VIEW_MODES.MONTH] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 sm:px-6 py-2 rounded-lg text-[10px] font-black transition-colors duration-300 whitespace-nowrap uppercase tracking-widest flex items-center justify-center min-w-[70px] ${
                  viewMode === mode
                    ? 'text-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:text-gray-200'
                }`}
              >
                {t(`schedule.view${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isFilterVisible ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="w-10 h-10 shadow-sm"
              title={t('common.filter')}
            >
              <SlidersHorizontal size={18} />
            </Button>
            {canEdit && (
              <Button
                size="icon"
                onClick={onAddSession}
                className="w-10 h-10 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all shadow-lg shadow-primary/25 group active:scale-95"
              >
                <Plus
                  size={20}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Expandable Filters */}
      {isFilterVisible && (
        <div className="px-4 sm:px-6 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Branch Filter */}
            <div className="flex-1 space-y-2">
              <Label className="uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5 text-[10px]">
                <MapPin size={12} className="text-primary/70" />
                {t('common.branch')}
              </Label>
              <Select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                size="sm"
              >
                <option value="">{t('common.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Teacher Filter */}
            {user?.role !== USER_ROLES.TEACHER && (
              <div className="flex-1 space-y-2">
                <Label className="uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5 text-[10px]">
                  <User size={12} className="text-primary/70" />
                  {t('schedule.teacher')}
                </Label>
                <Select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  size="sm"
                >
                  <option value="">{t('common.all')}</option>
                  {teachers
                    .filter((t) => !selectedBranch || t.branch_id === selectedBranch)
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                </Select>
              </div>
            )}

            {/* Class Filter */}
            <div className="flex-1 space-y-2">
              <Label className="uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5 text-[10px]">
                <BookOpen size={12} className="text-primary/70" />
                {t('menu.classes')}
              </Label>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                size="sm"
              >
                <option value="">{t('common.all')}</option>
                {classes
                  .filter((c) => !selectedBranch || c.branch_id === selectedBranch)
                  .map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleHeader;
