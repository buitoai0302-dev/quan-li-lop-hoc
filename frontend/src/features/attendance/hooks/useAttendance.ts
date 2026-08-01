import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAttendanceForSession, saveAttendance } from '../api/attendance.api';
import { getWeeklySchedule } from '@/features/schedule';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ATTENDANCE_STATUS } from '@/utils/constants';
import { normalizeSearchStr } from '@/utils/string';
import type { Session, AttendanceRecord, AttendanceStats, PendingAction } from '../types';
import { useNavigationPrompt } from '@/hooks/useNavigationPrompt';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useAttendance = (isAttendanceEnabled: boolean) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);

  const blocker = useNavigationPrompt(isDirty);

  // Fetch sessions for the selected date
  const sessionsQuery = useQuery({
    queryKey: ['sessions', selectedDate],
    queryFn: async () => {
      const data = await getWeeklySchedule(selectedDate, selectedDate);
      return data.sessions as Session[];
    },
    enabled: isAttendanceEnabled,
  });

  // Fetch attendance for the selected session
  const attendanceQuery = useQuery({
    queryKey: ['attendance', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return null;
      return getAttendanceForSession(selectedSessionId);
    },
    enabled: !!selectedSessionId,
  });

  // Sync query data with local state for editing
  useEffect(() => {
    if (attendanceQuery.data) {
      setLocalAttendance(attendanceQuery.data.attendance);
      setIsDirty(false);
    }
  }, [attendanceQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (records: { student_id: string; status: string }[]) => {
      if (!selectedSessionId) return;
      return saveAttendance(selectedSessionId, records);
    },
    onSuccess: () => {
      toast.success(t('attendance.saveSuccess'));
      setIsDirty(false);
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedSessionId] });
    },
    onError: (error) => {
      console.error('Save attendance error:', error);
      toast.error(t('errors.INTERNAL_ERROR'));
    },
  });

  const handleFetchAttendance = (sessionId: string, force = false) => {
    if (isDirty && !force) {
      setPendingAction({ type: 'session', id: sessionId });
      return;
    }
    setSelectedSessionId(sessionId);

    // Auto-collapse sessions list on mobile after selection
    if (window.innerWidth < 1024) {
      setIsSessionsExpanded(false);
      setIsControlsExpanded(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    if (isDirty) {
      setPendingAction({ type: 'date', date: newDate });
    } else {
      setSelectedDate(newDate);
      setSelectedSessionId(null);
      setLocalAttendance([]);

      // Auto-expand sessions list on mobile to let user select a new session
      if (window.innerWidth < 1024) {
        setIsSessionsExpanded(true);
      }
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setIsDirty(true);
    setLocalAttendance((prev) =>
      prev.map((record) => (record.student_id === studentId ? { ...record, status } : record))
    );
  };

  const handleMarkAllAsPresent = () => {
    setIsDirty(true);
    setLocalAttendance((prev) =>
      prev.map((record) => ({ ...record, status: ATTENDANCE_STATUS.PRESENT }))
    );
  };

  const handleSave = async () => {
    const records = localAttendance
      .filter((r) => r.status !== ATTENDANCE_STATUS.NONE)
      .map((r) => ({ student_id: r.student_id, status: r.status }));

    if (records.length === 0) {
      toast.error(t('attendance.selectSessionDesc'));
      return;
    }

    saveMutation.mutate(records);
  };

  const stats: AttendanceStats = useMemo(
    () => ({
      present: localAttendance.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
      absent: localAttendance.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length,
      late: localAttendance.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length,
      excused: localAttendance.filter((r) => r.status === ATTENDANCE_STATUS.EXCUSED).length,
      total: localAttendance.length,
    }),
    [localAttendance]
  );

  const filteredAttendance = useMemo(
    () =>
      localAttendance.filter(
        (r) => {
          const normalizedSearch = normalizeSearchStr(searchTerm);
          return (
            normalizeSearchStr(r.full_name).includes(normalizedSearch) ||
            (r.email && normalizeSearchStr(r.email).includes(normalizedSearch))
          );
        }
      ),
    [localAttendance, searchTerm]
  );

  const confirmLeave = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else if (pendingAction) {
      setIsDirty(false);
      if (pendingAction.type === 'date' && pendingAction.date) {
        setSelectedDate(pendingAction.date);
        setSelectedSessionId(null);
        setLocalAttendance([]);
        // Auto-expand sessions list on mobile
        if (window.innerWidth < 1024) {
          setIsSessionsExpanded(true);
        }
      } else if (pendingAction.type === 'session' && pendingAction.id) {
        handleFetchAttendance(pendingAction.id, true);
      }
      setPendingAction(null);
    }
  };

  const cancelLeave = () => {
    if (blocker.state === 'blocked') blocker.reset();
    setPendingAction(null);
  };

  const isReadOnly = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    // Read-only if it's NOT today (either past or future)
    return selDate.getTime() !== today.getTime();
  }, [selectedDate]);

  const isFutureDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    return selDate > today;
  }, [selectedDate]);

  return {
    sessions: sessionsQuery.data || [],
    selectedSession: attendanceQuery.data?.session || null,
    attendance: localAttendance,
    selectedDate,
    isReadOnly,
    isFutureDate,
    sessionsLoading: sessionsQuery.isLoading,
    attendanceLoading: attendanceQuery.isLoading,
    saving: saveMutation.isPending,
    searchTerm,
    setSearchTerm,
    isDirty,
    pendingAction,
    isControlsExpanded,
    setIsControlsExpanded,
    isSessionsExpanded,
    setIsSessionsExpanded,
    blocker,
    stats,
    filteredAttendance,
    handleDateChange,
    handleStatusChange,
    handleMarkAllAsPresent,
    handleSave,
    handlePrevDay: () =>
      handleDateChange(
        format(
          new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1)),
          'yyyy-MM-dd'
        )
      ),
    handleNextDay: () =>
      handleDateChange(
        format(
          new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1)),
          'yyyy-MM-dd'
        )
      ),
    handleToday: () => handleDateChange(format(new Date(), 'yyyy-MM-dd')),
    confirmLeave,
    cancelLeave,
    fetchAttendance: handleFetchAttendance,
  };
};
