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
import type { ScheduleHeaderProps } from '../types';
import ActionHint from '@/components/common/ActionHint';

const SCHEDULE_VIEW_MODES = [VIEW_MODES.DAY, VIEW_MODES.WEEK, VIEW_MODES.MONTH] as const;

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
  const filtersId = React.useId();

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
    const input = dateInputRef.current as HTMLInputElement;
    if (input) {
      if (typeof (input as any).showPicker === 'function') {
        (input as any).showPicker();
      } else {
        input.click();
      }
    }
  };

  const actionButtons = (
    <div className="flex items-center gap-2 shrink-0">
      <ActionHint label={t('common.filter')} showTouchLabel={false}>
        <Button
          variant="outline"
          size="icon"
          aria-expanded={isFilterVisible}
          aria-controls={filtersId}
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="size-11 rounded-lg transition-colors duration-150 aria-expanded:border-indigo-200 aria-expanded:bg-indigo-50 aria-expanded:text-indigo-700 motion-reduce:active:scale-100 dark:aria-expanded:border-indigo-800 dark:aria-expanded:bg-indigo-950 dark:aria-expanded:text-indigo-200 @min-[46rem]:size-9"
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
        </Button>
      </ActionHint>
      {canEdit && (
        <ActionHint label={t('schedule.addSession')} showTouchLabel={false}>
          <Button
            size="icon"
            aria-label={t('schedule.addSession', 'Thêm buổi học')}
            onClick={onAddSession}
            className="add-action size-11 rounded-lg @min-[46rem]:size-9"
          >
            <Plus size={19} aria-hidden="true" className="add-action-icon" />
          </Button>
        </ActionHint>
      )}
    </div>
  );

  return (
    <div className="@container sticky top-0 z-30 border-b border-slate-200 bg-surface dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4 @min-[46rem]:grid-cols-[minmax(0,1fr)_auto_auto]">
        <h1 className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-900 sm:text-lg dark:text-white">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:text-indigo-300">
            <Calendar size={17} aria-hidden="true" />
          </span>
          <span className="truncate first-letter:uppercase">
            {viewMode === VIEW_MODES.DAY && format(selectedDate, 'dd/MM/yyyy')}
            {viewMode === VIEW_MODES.WEEK &&
              `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd/MM')} – ${format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), 'dd/MM')}`}
            {viewMode === VIEW_MODES.MONTH &&
              format(selectedDate, 'MMMM yyyy', {
                locale: currentLocale as import('date-fns').Locale,
              })}
          </span>
        </h1>

        <div className="justify-self-end @min-[46rem]:col-start-3 @min-[46rem]:row-start-1">
          {actionButtons}
        </div>

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 @min-[46rem]:col-span-1 @min-[46rem]:col-start-2 @min-[46rem]:row-start-1 @min-[46rem]:justify-end">
          <div className="flex min-w-fit flex-1 items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 @min-[46rem]:flex-none">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.previous')}
              className="size-11 shrink-0 rounded-lg @min-[46rem]:size-9 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
              onClick={handlePrev}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <div
              className="relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg px-1 focus-within:outline-2 focus-within:outline-primary @min-[46rem]:min-h-9 @min-[46rem]:px-2"
              onClick={handleShowPicker}
            >
              <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-100">
                {format(selectedDate, 'dd/MM/yyyy')}
              </span>
              <input
                ref={dateInputRef}
                aria-label={t('schedule.selectDate', 'Chọn ngày')}
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))}
                className="absolute inset-0 w-full cursor-pointer opacity-0"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.next')}
              className="size-11 shrink-0 rounded-lg @min-[46rem]:size-9 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
              onClick={handleNext}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>

          <div className="relative isolate grid flex-1 grid-cols-[repeat(3,minmax(2.75rem,1fr))] rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 @min-[46rem]:flex-none">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 p-0.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
              style={{ transform: `translateX(${SCHEDULE_VIEW_MODES.indexOf(viewMode) * 100}%)` }}
            >
              <div className="h-full rounded-lg bg-white shadow-sm dark:bg-slate-700" />
            </div>
            {SCHEDULE_VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`relative min-h-11 min-w-11 whitespace-nowrap rounded-lg px-2 text-xs font-semibold focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary motion-safe:transition-colors @min-[46rem]:min-h-9 @min-[46rem]:px-3 pointer-coarse:min-h-11 ${
                  viewMode === mode
                    ? 'text-indigo-700 dark:text-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {t(`schedule.view${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        id={filtersId}
        inert={!isFilterVisible}
        className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 motion-safe:ease-in-out ${
          isFilterVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-gray-100 bg-gray-50/80 px-4 pb-4 pt-2 dark:border-gray-800 dark:bg-gray-900/80 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Branch Filter */}
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="schedule-branch"
                  className="uppercase tracking-[0.15em] flex items-center gap-1.5 text-xs ml-1"
                >
                  <MapPin size={12} className="text-primary/70" />
                  {t('common.branch')}
                </Label>
                <Select
                  id="schedule-branch"
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
                  <Label
                    htmlFor="schedule-teacher"
                    className="uppercase tracking-[0.15em] flex items-center gap-1.5 text-xs ml-1"
                  >
                    <User size={12} className="text-primary/70" />
                    {t('schedule.teacher')}
                  </Label>
                  <Select
                    id="schedule-teacher"
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
                <Label
                  htmlFor="schedule-class"
                  className="uppercase tracking-[0.15em] flex items-center gap-1.5 text-xs ml-1"
                >
                  <BookOpen size={12} className="text-primary/70" />
                  {t('menu.classes')}
                </Label>
                <Select
                  id="schedule-class"
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
        </div>
      </div>
    </div>
  );
};

export default ScheduleHeader;
