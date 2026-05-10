import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Session, Branch, ClassData, Room, Teacher, ViewMode } from '../types';
import api from '../api';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameDay } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import DraggableSessionCard from './DraggableSessionCard';
import DroppableDaySlot from './DroppableDaySlot';
import ConfirmModal from './ConfirmModal';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { handleApiError } from '../utils/errorHelper';
import { USER_ROLES, VIEW_MODES } from '../utils/constants';

import ScheduleHeader from './Schedule/ScheduleHeader';
import SessionDetailsModal from './Schedule/SessionDetailsModal';
import SessionFormModal from './Schedule/SessionFormModal';

const ScheduleBoard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const currentLocale = i18n.language === 'vi' ? vi : enUS;

  const canEdit = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.SUPER_ADMIN;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.WEEK);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(user?.branch_id || '');
  const [selectedTeacher, setSelectedTeacher] = useState<string>(user?.role === USER_ROLES.TEACHER ? user.id : '');
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && viewMode !== VIEW_MODES.DAY && viewMode !== VIEW_MODES.MONTH) {
        // Automatically switch to day view on small screens if in week view
        // setViewMode('day'); 
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Dependencies for the form
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    classId: '',
    roomId: '',
    teacherId: '',
    sessionDate: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  const getDaysToShow = () => {
    if (viewMode === VIEW_MODES.DAY) {
      return [selectedDate];
    } else if (viewMode === VIEW_MODES.WEEK) {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    } else {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const days = [];
      let current = startDate;
      while (current <= endDate) {
        days.push(current);
        current = addDays(current, 1);
      }
      return days;
    }
  };

  const daysToShow = getDaysToShow();

  const fetchData = async () => {
    try {
      const startDateStr = format(daysToShow[0], 'yyyy-MM-dd');
      const endDateStr = format(daysToShow[daysToShow.length - 1], 'yyyy-MM-dd');

      const scheduleRes = await api.get(`/schedule/weekly?startDate=${startDateStr}&endDate=${endDateStr}&branchId=${selectedBranch}&teacherId=${selectedTeacher}&classId=${selectedClass}`);

      if (scheduleRes.data.success) {
        setSessions(scheduleRes.data.data.sessions);
      }

      // Fetch shared data (needed for filters)
      const [branchesRes, teachersRes] = await Promise.all([
        api.get('/branches'),
        api.get('/teachers')
      ]);
      setBranches(branchesRes.data);
      setTeachers(teachersRes.data);

      // Fetch editing/filtering-specific data
      if (canEdit || user?.role === USER_ROLES.TEACHER) {
        const [classesRes, roomsRes] = await Promise.all([
          api.get('/classes'),
          api.get('/rooms')
        ]);
        setClasses(classesRes.data);
        setRooms(roomsRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      handleApiError(error, t);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, viewMode, selectedBranch, selectedTeacher, selectedClass]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const sessionId = active.id as string;
    const newDate = over.id as string;

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const oldDateStr = session.session_date.split('T')[0];
    if (oldDateStr === newDate) return;

    const previousSessions = [...sessions];
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, session_date: newDate } : s));

    try {
      const response = await api.put(`/schedule/sessions/${sessionId}`, {
        sessionDate: newDate,
        startTime: session.start_time,
        endTime: session.end_time,
        roomId: session.room_id,
        teacherId: session.teacher_id,
        classId: session.class_id
      });

      if (response.data.success) {
        toast.success(t('common.success'));
        fetchData();
      }
    } catch (error: any) {
      setSessions(previousSessions);
      if (error.response?.status === 409) {
        toast.error(`${t('schedule.conflictError')}: ${error.response.data.conflicts[0].detail}`);
      } else {
        handleApiError(error, t);
      }
    }
  };

  const handleOpenModal = (session?: Session) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        classId: session.class_id,
        roomId: session.room_id,
        teacherId: session.teacher_id,
        sessionDate: session.session_date.split('T')[0],
        startTime: session.start_time ? session.start_time.substring(0, 5) : '08:00',
        endTime: session.end_time ? session.end_time.substring(0, 5) : '10:00',
        notes: session.notes || ''
      });
    } else {
      setEditingSession(null);
      const defaultClassId = classes.length > 0 ? classes[0].id : '';
      const defaultClass = classes.find(c => c.id === defaultClassId);

      setFormData({
        classId: defaultClassId,
        roomId: rooms.length > 0 ? rooms[0].id : '',
        teacherId: defaultClass ? defaultClass.teacher_id : (teachers.length > 0 ? teachers[0].id : ''),
        sessionDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '08:00',
        endTime: '10:00',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedClassId = e.target.value;
    const selectedClass = classes.find(c => c.id === selectedClassId);

    setFormData(prev => ({
      ...prev,
      classId: selectedClassId,
      // Auto-map teacher of the class
      teacherId: selectedClass?.teacher_id || prev.teacherId
    }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await api.put(`/schedule/sessions/${editingSession.id}`, formData);
        toast.success(t('common.success'));
      } else {
        await api.post('/schedule/sessions', formData);
        toast.success(t('common.success'));
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error(`${t('schedule.conflictError')}: ${error.response.data.conflicts[0].detail}`);
      } else {
        handleApiError(error, t);
      }
    }
  };

  const handleDelete = async () => {
    if (!editingSession) return;
    try {
      await api.delete(`/schedule/sessions/${editingSession.id}`);
      toast.success(t('common.success'));
      handleCloseModal();
      fetchData();
    } catch (error) {
      handleApiError(error, t);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-gray-800 rounded-lg shadow-sm border border-border dark:border-gray-700 overflow-hidden transition-colors duration-200">
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
                t('schedule.days.sun')
              ].map((d, i) => (
                <div key={i} className="p-2 text-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 border-r border-border dark:border-gray-600 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
          )}
          <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7 min-w-[800px] sm:min-w-[1000px] xl:min-w-full'} divide-x divide-y divide-border dark:divide-gray-700 flex-1`}>
            {daysToShow.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = viewMode === 'month' ? day.getMonth() === selectedDate.getMonth() : true;

              return (
                <div key={idx} className={`flex flex-col ${viewMode === 'month' ? 'min-h-[100px] sm:min-h-[140px]' : 'min-h-[300px]'} ${!isCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-900/50' : ''}`}>
                  {viewMode !== 'month' ? (
                    <div className={`p-1 sm:p-3 text-center border-b border-border dark:border-gray-600 ${isToday ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-gray-50/80 dark:bg-gray-800'} backdrop-blur-sm sticky top-0 z-10`}>
                      <div className={`font-semibold ${isToday ? 'text-primary dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'} text-xs sm:text-sm`}>
                        {format(day, 'EEEE', { locale: currentLocale })}
                      </div>
                      <div className={`text-xs sm:text-sm ${isToday ? 'text-primary font-bold dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {format(day, 'dd/MM')}
                      </div>
                    </div>
                  ) : (
                    <div className={`p-1 text-right ${isToday ? 'bg-blue-50 dark:bg-blue-900/40 text-primary dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-400 font-medium'} text-xs sm:text-sm`}>
                      <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${isToday ? 'bg-primary text-white' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  )}
                  <DroppableDaySlot
                    id={dateStr}
                    className={viewMode === 'day' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 content-start p-3 sm:p-4' : 'flex flex-col gap-2'}
                  >
                    {sessions
                      .filter(s => s.session_date.startsWith(dateStr))
                      .map(session => (
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
        onEdit={(s) => { setViewingSession(null); handleOpenModal(s); }}
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
    </div>
  );
};

export default ScheduleBoard;
