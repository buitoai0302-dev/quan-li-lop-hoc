import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, VIEW_MODES } from '@/utils/constants';
import { handleApiError } from '@/utils/errorHelper';
import toast from 'react-hot-toast';
import type { Session, Branch, ClassData, Room, Teacher, ViewMode } from '@/types';

export const useScheduleBoard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canEdit =
    user?.role === USER_ROLES.ADMIN ||
    user?.role === USER_ROLES.STAFF ||
    user?.role === USER_ROLES.SUPER_ADMIN;

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Persistence for viewMode
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('scheduleViewMode');
    return (saved as ViewMode) || VIEW_MODES.WEEK;
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('scheduleViewMode', mode);
  };

  const [selectedBranch, setSelectedBranch] = useState<string>(user?.branch_id || '');
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    user?.role === USER_ROLES.TEACHER ? user.id : ''
  );
  const [selectedClass, setSelectedClass] = useState<string>('');

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
    notes: '',
  });

  const daysToShow = useMemo(() => {
    if (viewMode === VIEW_MODES.DAY) {
      return [selectedDate];
    } else if (viewMode === VIEW_MODES.WEEK) {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    } else {
      const monthStart = startOfMonth(selectedDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      
      // Always show 42 days (6 weeks) for a consistent monthly grid
      return Array.from({ length: 42 }).map((_, i) => addDays(startDate, i));
    }
  }, [selectedDate, viewMode]);

  // Queries
  const sessionsQuery = useQuery({
    queryKey: ['sessions', selectedDate, viewMode, selectedBranch, selectedTeacher, selectedClass],
    queryFn: async () => {
      const startDateStr = format(daysToShow[0], 'yyyy-MM-dd');
      const endDateStr = format(daysToShow[daysToShow.length - 1], 'yyyy-MM-dd');
      const res = await api.get(
        `/schedule/weekly?startDate=${startDateStr}&endDate=${endDateStr}&branchId=${selectedBranch}&teacherId=${selectedTeacher}&classId=${selectedClass}`
      );
      return res.data.data.sessions as Session[];
    },
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get('/branches')).data as Branch[],
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => (await api.get('/teachers')).data as Teacher[],
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/classes')).data as ClassData[],
    enabled: canEdit || user?.role === USER_ROLES.TEACHER,
  });

  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => (await api.get('/rooms')).data as Room[],
    enabled: canEdit || user?.role === USER_ROLES.TEACHER,
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      api.put(`/schedule/sessions/${id}`, data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error: any) => handleApiError(error, t),
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => api.post('/schedule/sessions', data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => handleApiError(error, t),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/schedule/sessions/${id}`),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsDeleteModalOpen(false);
      setIsModalOpen(false);
    },
    onError: (error: any) => handleApiError(error, t),
  });

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
        notes: session.notes || '',
      });
    } else {
      setEditingSession(null);
      const defaultClass = classesQuery.data?.[0];
      setFormData({
        classId: defaultClass?.id || '',
        roomId: roomsQuery.data?.[0]?.id || '',
        teacherId: defaultClass?.teacher_id || teachersQuery.data?.[0]?.id || '',
        sessionDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '08:00',
        endTime: '10:00',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  return {
    sessions: sessionsQuery.data || [],
    isLoading: sessionsQuery.isLoading,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    branches: branchesQuery.data || [],
    selectedBranch,
    setSelectedBranch,
    teachers: teachersQuery.data || [],
    selectedTeacher,
    setSelectedTeacher,
    classes: classesQuery.data || [],
    selectedClass,
    setSelectedClass,
    rooms: roomsQuery.data || [],
    isModalOpen,
    setIsModalOpen,
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
    handleCloseModal: () => setIsModalOpen(false),
    handleSubmit: (e: React.FormEvent) => {
      e.preventDefault();
      if (editingSession) {
        updateSessionMutation.mutate({ id: editingSession.id, data: formData });
      } else {
        createSessionMutation.mutate(formData);
      }
    },
    handleDelete: () => {
      if (editingSession) deleteSessionMutation.mutate(editingSession.id);
    },
    updateSessionMutation,
  };
};
