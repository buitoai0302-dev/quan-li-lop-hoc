import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Session } from '../types';
import api from '../api';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameDay } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import DraggableSessionCard from './DraggableSessionCard';
import DroppableDaySlot from './DroppableDaySlot';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/errorHelper';

type ViewMode = 'day' | 'week' | 'month';

const ScheduleBoard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const currentLocale = i18n.language === 'vi' ? vi : enUS;
  
  const canEdit = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'super_admin';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Dependencies for the form
  const [classes, setClasses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
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
    if (viewMode === 'day') {
      return [selectedDate];
    } else if (viewMode === 'week') {
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

      const scheduleRes = await api.get(`/schedule/weekly?startDate=${startDateStr}&endDate=${endDateStr}`);

      if (scheduleRes.data.success) {
        setSessions(scheduleRes.data.data.sessions);
      }

      if (canEdit) {
        const [classesRes, roomsRes, teachersRes] = await Promise.all([
          api.get('/classes'),
          api.get('/rooms'),
          api.get('/teachers')
        ]);
        setClasses(classesRes.data);
        setRooms(roomsRes.data);
        setTeachers(teachersRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      handleApiError(error, t);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, viewMode]);

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

  const handlePrev = () => {
    if (viewMode === 'day') setSelectedDate(addDays(selectedDate, -1));
    else if (viewMode === 'week') setSelectedDate(addDays(selectedDate, -7));
    else setSelectedDate(addDays(selectedDate, -30)); // approximate month
  };

  const handleNext = () => {
    if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
    else if (viewMode === 'week') setSelectedDate(addDays(selectedDate, 7));
    else setSelectedDate(addDays(selectedDate, 30));
  };

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-gray-800 rounded-xl shadow-lg border border-border dark:border-gray-700 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between p-3 sm:p-4 border-b border-border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 gap-3 sm:gap-4 shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between xl:justify-start gap-3 sm:gap-4 w-full xl:w-auto">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
            {viewMode === 'day' && format(selectedDate, 'dd/MM/yyyy')}
            {viewMode === 'week' && t('schedule.weekOf', { date: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd/MM/yyyy') })}
            {viewMode === 'month' && format(selectedDate, 'MM/yyyy')}
          </h2>

          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('day')}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${viewMode === 'day' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {t('schedule.viewDay')}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium border-l border-r border-gray-300 dark:border-gray-600 ${viewMode === 'week' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {t('schedule.viewWeek')}
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${viewMode === 'month' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {t('schedule.viewMonth')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(new Date(e.target.value));
              }}
              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-primary focus:border-primary min-w-[150px] sm:w-auto"
            />

            <div className="flex space-x-1">
              <button
                className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm text-gray-700 dark:text-gray-300"
                onClick={handlePrev}
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button
                className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm text-gray-700 dark:text-gray-300"
                onClick={handleNext}
              >
                <ChevronRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {canEdit && (
            <button
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-sm text-xs sm:text-sm font-medium flex items-center gap-1 shrink-0"
              onClick={() => handleOpenModal()}
            >
              <Plus size={16} /> <span className="hidden sm:inline">{t('schedule.addSession')}</span>
            </button>
          )}
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 flex flex-col">
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 border-b border-border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 sticky top-0 z-20 min-w-[700px] sm:min-w-[1000px]">
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
          <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7 min-w-[700px] sm:min-w-[1000px]'} divide-x divide-y divide-border dark:divide-gray-600 flex-1`}>
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
                          <DraggableSessionCard session={session} onEdit={canEdit ? handleOpenModal : undefined} />
                        </div>
                      ))}
                  </DroppableDaySlot>
                </div>
              );
            })}
          </div>
        </div>
      </DndContext>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSession ? t('schedule.editSession') : t('schedule.addSession')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('schedule.date')} *</label>
              <input
                required type="date"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
                value={formData.sessionDate}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('schedule.startTime')} *</label>
                <input
                  required type="time"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('schedule.endTime')} *</label>
                <input
                  required type="time"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('schedule.class')} *</label>
            <select required className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
              value={formData.classId} onChange={handleClassChange}>
              <option value="" disabled>---</option>
              {classes.filter(c => c.status !== 'cancelled').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Compute currently selected branch based on class */}
          {(() => {
            const selectedClass = classes.find(c => c.id === formData.classId);
            const branchId = selectedClass?.branch_id;
            
            return (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('schedule.teacher')} *</label>
                  <select required className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
                    value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}>
                    <option value="" disabled>---</option>
                    {teachers
                      .filter(t => t.is_active !== false)
                      .filter(t => !branchId || t.branch_id === branchId)
                      .map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('schedule.room')} *</label>
                  <select required className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
                    value={formData.roomId} onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}>
                    <option value="" disabled>---</option>
                    {rooms
                      .filter(r => r.is_active !== false)
                      .filter(r => !branchId || r.branch_id === branchId)
                      .map(r => <option key={r.id} value={r.id}>{r.name} ({r.branch_name})</option>)}
                  </select>
                </div>
              </>
            );
          })()}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.notes')}</label>
            <textarea rows={2} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
              value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            <button type="submit" className="w-full justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-white hover:bg-primary-dark font-medium sm:text-sm">
              {t('common.save')}
            </button>
            {editingSession ? (
              <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="w-full justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 font-medium sm:text-sm">
                {t('common.delete')}
              </button>
            ) : (
              <button type="button" onClick={handleCloseModal} className="w-full justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 font-medium sm:text-sm">
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      </Modal>

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
