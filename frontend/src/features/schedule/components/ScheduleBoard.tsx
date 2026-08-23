import React, { useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { format, isSameDay } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { VIEW_MODES } from '@/utils/constants';
import { Card } from '@/components/common/UI';

import DraggableSessionCard from './DraggableSessionCard';
import DroppableDaySlot from './DroppableDaySlot';
import ConfirmModal from '@/components/common/ConfirmModal';
import ScheduleHeader from './ScheduleHeader';
import SessionDetailsModal from './SessionDetailsModal';
import SessionFormModal from './SessionFormModal';
import { useScheduleBoard } from '../hooks/useScheduleBoard';

const ScheduleBoard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const currentLocale = i18n.language === 'vi' ? vi : enUS;

  const {
    sessions,
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
    rooms,
    isModalOpen,
    isFilterVisible,
    setIsFilterVisible,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    editingSession,
    viewingSession,
    setViewingSession,
    formData,
    setFormData,
    daysToShow,
    canEdit,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handlePrev,
    handleNext,
    updateSessionMutation,
  } = useScheduleBoard();

  // Swipe Handlers
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const touchEndX = React.useRef(0);
  const touchEndY = React.useRef(0);
  const touchStartTime = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const duration = Date.now() - touchStartTime.current;
    const velocity = Math.abs(distanceX) / duration;

    // Trigger only if horizontal movement is strongly dominant and meets higher thresholds
    if (
      Math.abs(distanceX) > Math.abs(distanceY) * 3 && // Extremely strict horizontal dominance
      Math.abs(distanceX) > 150 && // Minimum distance of 150px
      velocity > 0.8 // High velocity required
    ) {
      if (distanceX > 0) {
        handleNext(); // Swipe Left -> Next
      } else {
        handlePrev(); // Swipe Right -> Prev
      }
    }
    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && viewMode === VIEW_MODES.WEEK) {
        // setViewMode(VIEW_MODES.DAY);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!canEdit) return;
      const { active, over } = event;
      if (!over) return;

      const sessionId = active.id as string;
      const newDate = over.id as string;

      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const oldDateStr = session.session_date.split('T')[0];
      if (oldDateStr === newDate) return;

      updateSessionMutation.mutate({
        id: sessionId,
        data: {
          sessionDate: newDate,
          startTime: session.start_time,
          endTime: session.end_time,
          roomId: session.room_id,
          teacherId: session.teacher_id,
          classId: session.class_id,
        },
      });
    },
    [canEdit, sessions, updateSessionMutation]
  );

  const handleClassChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedClassId = e.target.value;
      const selectedCls = classes.find((c) => c.id === selectedClassId);

      setFormData((prev) => ({
        ...prev,
        classId: selectedClassId,
        teacherId: selectedCls?.teacher_id || prev.teacherId,
      }));
    },
    [classes, setFormData]
  );

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, typeof sessions> = {};
    sessions.forEach((session) => {
      const dateStr = session.session_date.split('T')[0];
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(session);
    });
    return grouped;
  }, [sessions]);

  return (
    <Card
      className="flex flex-col flex-1 h-full min-h-0 overflow-hidden shadow-none border-none bg-transparent"
      scrollable={false}
    >
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <ScheduleHeader
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          branches={branches}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          classes={classes}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          isFilterVisible={isFilterVisible}
          setIsFilterVisible={setIsFilterVisible}
          canEdit={canEdit}
          onAddSession={() => handleOpenModal()}
          onPrev={handlePrev}
          onNext={handleNext}
          currentLocale={currentLocale}
          user={user}
          t={t}
        />

        <div
          className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-white dark:bg-gray-800"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === VIEW_MODES.MONTH && (
            <div className="grid grid-cols-7 border-b border-border dark:border-gray-600 sticky top-0 z-20 min-w-[800px] sm:min-w-[1000px] xl:min-w-full shadow-sm">
              {[
                t('schedule.days.mon'),
                t('schedule.days.tue'),
                t('schedule.days.wed'),
                t('schedule.days.thu'),
                t('schedule.days.fri'),
                t('schedule.days.sat'),
                t('schedule.days.sun'),
              ].map((d, i) => (
                <div
                  key={i}
                  className={`p-2.5 sm:p-3 text-center text-xs sm:text-sm font-bold uppercase tracking-wider ${
                    i === 6
                      ? 'bg-red-50/80 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  } border-r border-border dark:border-gray-600 last:border-r-0`}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
          <div
            className={`grid ${viewMode === VIEW_MODES.DAY ? 'grid-cols-1' : 'grid-cols-7 min-w-[800px] sm:min-w-[1000px] xl:min-w-full'} border-l border-t border-border dark:border-gray-700`}
          >
            {daysToShow.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth =
                viewMode === VIEW_MODES.MONTH ? day.getMonth() === selectedDate.getMonth() : true;
              const isSunday = day.getDay() === 0;

              return (
                <div
                  key={idx}
                  className={`flex flex-col border-r border-b border-border dark:border-gray-700 ${viewMode === VIEW_MODES.MONTH ? 'min-h-[120px] sm:min-h-[160px]' : 'min-h-[300px]'} ${!isCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-900/50' : isSunday ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                >
                  {viewMode !== VIEW_MODES.MONTH ? (
                    <div
                      className={`p-2 sm:p-3 text-center border-b border-border dark:border-gray-600 ${isToday ? 'bg-primary/10 dark:bg-primary/20' : isSunday ? 'bg-red-50/80 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800/80'} backdrop-blur-md sticky top-0 z-10 shadow-sm`}
                    >
                      <div
                        className={`font-black uppercase tracking-widest ${isToday ? 'text-primary dark:text-blue-400' : isSunday ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'} text-[10px] sm:text-[11px] mb-0.5`}
                      >
                        {format(day, 'EEEE', { locale: currentLocale })}
                      </div>
                      <div
                        className={`text-sm sm:text-lg ${isToday ? 'text-primary font-black dark:text-blue-400' : isSunday ? 'text-red-600 font-bold dark:text-red-400' : 'text-slate-700 dark:text-slate-200 font-bold'}`}
                      >
                        {format(day, 'dd/MM')}
                      </div>
                      {isToday && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-md" />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`p-1.5 text-right ${isToday ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 font-bold' : isSunday ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400 font-medium'} text-xs sm:text-sm border-b border-gray-100 dark:border-gray-800`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${isToday ? 'bg-primary text-white shadow-md' : ''}`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                  )}
                  <DroppableDaySlot
                    id={dateStr}
                    className={
                      viewMode === VIEW_MODES.DAY
                        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 content-start p-3 sm:p-4'
                        : 'flex flex-col gap-2'
                    }
                  >
                    {(sessionsByDate[dateStr] || []).map((session) => (
                      <div key={session.id} className={viewMode === VIEW_MODES.DAY ? 'h-full' : ''}>
                        <DraggableSessionCard
                          session={session}
                          onEdit={canEdit ? handleOpenModal : undefined}
                          onView={(s) => setViewingSession(s)}
                        />
                      </div>
                    ))}
                  </DroppableDaySlot>
                </div>
              );
            })}
          </div>
        </div>
      </DndContext>

      <SessionFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingSession={editingSession}
        formData={formData}
        setFormData={setFormData}
        classes={classes}
        rooms={rooms}
        teachers={teachers}
        onSubmit={handleSubmit}
        onDelete={() => setIsDeleteModalOpen(true)}
        onClassChange={handleClassChange}
        t={t}
      />

      <SessionDetailsModal
        isOpen={!!viewingSession}
        onClose={() => setViewingSession(null)}
        session={viewingSession}
        onEdit={(s) => {
          setViewingSession(null);
          handleOpenModal(s);
        }}
        canEdit={canEdit}
        currentLocale={currentLocale}
        user={user}
        t={t}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          handleDelete();
          setIsDeleteModalOpen(false);
        }}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
      />
    </Card>
  );
};

export default ScheduleBoard;
