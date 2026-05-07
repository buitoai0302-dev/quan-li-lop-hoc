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
import { Plus, ChevronLeft, ChevronRight, Clock, User, MapPin, FileText, Info, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
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
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(user?.branch_id || '');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && viewMode !== 'day' && viewMode !== 'month') {
        // Automatically switch to day view on small screens if in week view
        // setViewMode('day'); 
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Dependencies for the form
  const [classes, setClasses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

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

      const scheduleRes = await api.get(`/schedule/weekly?startDate=${startDateStr}&endDate=${endDateStr}&branchId=${selectedBranch}&teacherId=${selectedTeacher}`);

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

      // Fetch editing-specific data
      if (canEdit) {
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
  }, [selectedDate, viewMode, selectedBranch, selectedTeacher]);

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
      <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all sticky top-0 z-30 shadow-sm">
        {/* Main Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-4">
          
          {/* Left Side: Title & Date Navigation */}
          <div className="flex items-center justify-between lg:justify-start gap-2 sm:gap-4 min-w-0">
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate leading-tight">
                {viewMode === 'day' && format(selectedDate, 'dd/MM/yyyy')}
                {viewMode === 'week' && (
                  <span className="flex items-center gap-1 text-primary">
                    <span>{format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd/MM')}</span>
                    <span className="text-gray-300">—</span>
                    <span>{format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), 'dd/MM')}</span>
                  </span>
                )}
                {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: currentLocale })}
              </h1>
              <div className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">
                {t('schedule.manageSchedule') || 'Quản lý lịch học'}
              </div>
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl p-0.5 sm:p-1 shadow-inner shrink-0">
              <button className="p-1 sm:p-1.5 text-gray-500 hover:bg-white dark:hover:bg-gray-700 rounded-md sm:rounded-lg transition-all" onClick={handlePrev}>
                <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
              </button>
              <div className="relative">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))}
                  className="bg-transparent border-none p-0 text-[9px] sm:text-[10px] font-black text-gray-700 dark:text-gray-300 focus:ring-0 w-16 sm:w-20 text-center cursor-pointer"
                />
              </div>
              <button className="p-1 sm:p-1.5 text-gray-500 hover:bg-white dark:hover:bg-gray-700 rounded-md sm:rounded-lg transition-all" onClick={handleNext}>
                <ChevronRight size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Center & Right: Switcher + Actions grouped for mobile */}
          <div className="flex items-center justify-between sm:justify-center gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex p-0.5 sm:p-1 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-inner shrink-0">
              {['day', 'week', 'month'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as ViewMode)}
                  className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${viewMode === mode
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                >
                  {t(`schedule.view${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                </button>
              ))}
            </div>

            {/* Actions: Filter & Add */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsFilterVisible(!isFilterVisible)}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl transition-all border active:scale-95 ${isFilterVisible
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100'
                  }`}
              >
                <SlidersHorizontal size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              {canEdit && (
                <button
                  onClick={() => handleOpenModal()}
                  className="w-9 h-9 sm:w-auto sm:px-4 sm:h-11 bg-primary hover:bg-primary-dark text-white rounded-lg sm:rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group active:scale-95"
                >
                  <Plus size={18} className="sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">{t('schedule.addSession')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Expandable Filters (Mobile-friendly) */}
        {isFilterVisible && (
          <div className="px-3 sm:px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[140px] sm:max-w-[200px]">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">
                  {t('common.branch') || 'Chi nhánh'}
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">{t('common.allBranches')}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="absolute right-2.5 bottom-2.5 pointer-events-none text-gray-400">
                  <ChevronLeft size={12} className="-rotate-90" />
                </div>
              </div>

              {/* Teacher Filter */}
              <div className="relative flex-1 min-w-[140px] sm:max-w-[200px]">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">
                  {t('schedule.teacher') || 'Giáo viên'}
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">{t('common.all') || 'Tất cả'}</option>
                  {teachers
                    .filter(t => !selectedBranch || t.branch_id === selectedBranch)
                    .map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                    ))}
                </select>
                <div className="absolute right-2.5 bottom-2.5 pointer-events-none text-gray-400">
                  <ChevronLeft size={12} className="-rotate-90" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 flex flex-col">
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 border-b border-border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 sticky top-0 z-20 min-w-[800px] sm:min-w-[1200px]">
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
          <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7 min-w-[800px] sm:min-w-[1200px]'} divide-x divide-y divide-border dark:divide-gray-700 flex-1`}>
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

      {/* Add/Edit Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSession ? t('schedule.editSession') : t('schedule.addSession')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3 py-0.5">
          {/* Time & Date Section - Ultra Compact */}
          <div className="bg-blue-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-blue-100/50 dark:border-indigo-500/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 dark:text-indigo-300 uppercase ml-1">{t('schedule.date')} *</label>
                <div className="relative group">
                  <input
                    required type="date"
                    value={formData.sessionDate}
                    onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                    className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  />
                  <Clock size={14} className="absolute left-2.5 top-2 text-blue-500 dark:text-indigo-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-600 dark:text-indigo-300 uppercase ml-1">{t('schedule.startTime')} *</label>
                  <input
                    required type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-600 dark:text-indigo-300 uppercase ml-1">{t('schedule.endTime')} *</label>
                  <input
                    required type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Details Section - Grid Layout to save vertical space */}
          <div className="space-y-3 px-0.5">
            {(() => {
              const selectedClass = classes.find(c => c.id === formData.classId);
              const branchId = selectedClass?.branch_id;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('schedule.class')} *</label>
                      <div className="relative group">
                        <select
                          required
                          value={formData.classId}
                          onChange={handleClassChange}
                          className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer"
                        >
                          <option value="" disabled>---</option>
                          {classes.filter(c => c.status !== 'cancelled').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <Info size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('schedule.teacher')} *</label>
                      <div className="relative group">
                        <select
                          required
                          value={formData.teacherId}
                          onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                          className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer"
                        >
                          <option value="" disabled>---</option>
                          {teachers
                            .filter(t => t.is_active !== false)
                            .filter(t => !branchId || t.branch_id === branchId)
                            .map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                        <User size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('schedule.room')} *</label>
                      <div className="relative group">
                        <select
                          required
                          value={formData.roomId}
                          onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                          className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer"
                        >
                          <option value="" disabled>---</option>
                          {rooms
                            .filter(r => r.is_active !== false)
                            .filter(r => !branchId || r.branch_id === branchId)
                            .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <MapPin size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('common.notes')}</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full pl-8 pr-2 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                          placeholder={t('schedule.notesPlaceholder')}
                        />
                        <FileText size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Actions - Horizontal layout for Update/Delete to save space */}
          <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary text-white font-black rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-xs uppercase tracking-widest active:scale-[0.98]"
            >
              {editingSession ? t('common.update') : t('common.save')}
            </button>
            {editingSession ? (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 transition-all text-[10px] uppercase tracking-widest border border-red-100 dark:border-red-500/10"
              >
                {t('common.delete')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* Session Details Modal */}
      <Modal
        isOpen={!!viewingSession}
        onClose={() => setViewingSession(null)}
        title={t('schedule.sessionDetails')}
        maxWidth="max-w-md"
      >
        {viewingSession && (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">
                {viewingSession.class_name?.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{viewingSession.class_name}</h3>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">{viewingSession.branch_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('schedule.time')}</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {viewingSession.start_time.substring(0, 5)} — {viewingSession.end_time.substring(0, 5)}
                  </p>
                  <p className="text-xs text-gray-500">{format(new Date(viewingSession.session_date), 'EEEE, dd/MM/yyyy', { locale: currentLocale })}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('schedule.teacher')}</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{viewingSession.teacher_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('schedule.room')}</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{viewingSession.room_name}</p>
                </div>
              </div>

              {viewingSession.notes && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">{t('common.notes')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{viewingSession.notes}"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => setViewingSession(null)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
              >
                {t('common.close')}
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    const session = viewingSession;
                    setViewingSession(null);
                    handleOpenModal(session);
                  }}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-sm"
                >
                  {t('common.edit')}
                </button>
              )}
            </div>
          </div>
        )}
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
