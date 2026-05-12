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
    updateSessionMutation,
  } = useScheduleBoard();

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
    <Card className="flex flex-col h-full overflow-hidden" scrollable={false}>
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
        currentLocale={currentLocale}
        user={user}
        t={t}
      />

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 flex flex-col">
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 border-b border-border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 sticky top-0 z-20 min-w-[800px] sm:min-w-[1000px] xl:min-w-full">
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
                  className="p-2 text-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 border-r border-border dark:border-gray-600 last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
          )}
          <div
            className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7 min-w-[800px] sm:min-w-[1000px] xl:min-w-full'} divide-x divide-y divide-border dark:divide-gray-700 flex-1`}
          >
            {daysToShow.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth =
                viewMode === 'month' ? day.getMonth() === selectedDate.getMonth() : true;

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${viewMode === 'month' ? 'min-h-[100px] sm:min-h-[140px]' : 'min-h-[300px]'} ${!isCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-900/50' : ''}`}
                >
                  {viewMode !== 'month' ? (
                    <div
                      className={`p-1 sm:p-3 text-center border-b border-border dark:border-gray-600 ${isToday ? 'bg-primary/5 dark:bg-primary/10' : 'bg-white/60 dark:bg-gray-800/40'} backdrop-blur-md sticky top-0 z-10`}
                    >
                      <div
                        className={`font-black uppercase tracking-widest ${isToday ? 'text-primary dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'} text-[10px] sm:text-[11px]`}
                      >
                        {format(day, 'EEEE', { locale: currentLocale })}
                      </div>
                      <div
                        className={`text-sm sm:text-base mt-1 ${isToday ? 'text-primary font-black dark:text-blue-300' : 'text-gray-900 dark:text-white font-bold'}`}
                      >
                        {format(day, 'dd/MM')}
                      </div>
                      {isToday && (
                        <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`p-1 text-right ${isToday ? 'bg-blue-50 dark:bg-blue-900/40 text-primary dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-400 font-medium'} text-xs sm:text-sm`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${isToday ? 'bg-primary text-white' : ''}`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                  )}
                  <DroppableDaySlot
                    id={dateStr}
                    className={
                      viewMode === 'day'
                        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 content-start p-3 sm:p-4'
                        : 'flex flex-col gap-2'
                    }
                  >
                    {(sessionsByDate[dateStr] || []).map((session) => (
                      <div key={session.id} className={viewMode === 'day' ? 'h-full' : ''}>
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
