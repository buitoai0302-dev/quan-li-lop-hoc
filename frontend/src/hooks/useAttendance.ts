import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ATTENDANCE_STATUS } from '../utils/constants';
import type { Session, AttendanceRecord, AttendanceStats, PendingAction } from '../pages/Attendance/types';
import { useNavigationPrompt } from './useNavigationPrompt';

export const useAttendance = (isAttendanceEnabled: boolean) => {
  const { t } = useTranslation();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);

  const blocker = useNavigationPrompt(isDirty);
  
  // Use a ref to track the selected session ID to avoid infinite loops in fetchSessions
  const selectedSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedSessionIdRef.current = selectedSession?.id || null;
  }, [selectedSession]);

  const fetchAttendance = useCallback(async (sessionId: string, force = false) => {
    if (isDirty && !force) {
      setPendingAction({ type: 'session', id: sessionId });
      return;
    }
    setIsDirty(false);
    setPendingAction(null);
    try {
      setAttendanceLoading(true);
      const res = await api.get(`/attendance/session/${sessionId}`);
      setAttendance(res.data.attendance);
      setSelectedSession(res.data.session);
      
      // Auto-collapse sessions list on mobile after selection
      if (window.innerWidth < 1024) {
        setIsSessionsExpanded(false);
        setIsControlsExpanded(false);
      }
    } catch (error) {
      console.error('Fetch attendance error:', error);
      toast.error(t('errors.INTERNAL_ERROR'));
    } finally {
      setAttendanceLoading(false);
    }
  }, [isDirty, t]);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get(`/schedule/weekly?startDate=${selectedDate}&endDate=${selectedDate}`);
      const fetchedSessions = res.data.data.sessions;
      setSessions(fetchedSessions);

      const currentSelectedId = selectedSessionIdRef.current;
      if (currentSelectedId) {
        const stillExists = fetchedSessions.find((s: Session) => s.id === currentSelectedId);
        if (stillExists) {
          fetchAttendance(currentSelectedId);
        } else {
          setSelectedSession(null);
          setAttendance([]);
        }
      }
    } catch (error) {
      console.error('Fetch sessions error:', error);
      toast.error(t('errors.INTERNAL_ERROR'));
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedDate, fetchAttendance, t]);

  useEffect(() => {
    if (isAttendanceEnabled) {
      fetchSessions();
    }
  }, [selectedDate, isAttendanceEnabled, fetchSessions]);

  const handleDateChange = (newDate: string) => {
    if (isDirty) {
      setPendingAction({ type: 'date', date: newDate });
    } else {
      setSelectedDate(newDate);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setIsDirty(true);
    setAttendance(prev => prev.map(record =>
      record.student_id === studentId ? { ...record, status } : record
    ));
  };

  const handleMarkAllAsPresent = () => {
    setIsDirty(true);
    setAttendance(prev => prev.map(record => ({ ...record, status: ATTENDANCE_STATUS.PRESENT as any })));
  };

  const handleSave = async () => {
    if (!selectedSession) return;
    try {
      setSaving(true);
      const records = attendance
        .filter(r => r.status !== ATTENDANCE_STATUS.NONE)
        .map(r => ({ student_id: r.student_id, status: r.status }));

      if (records.length === 0) {
        toast.error(t('attendance.selectSessionDesc'));
        return;
      }

      await api.post(`/attendance/session/${selectedSession.id}`, { records });
      toast.success(t('attendance.saveSuccess'));
      setIsDirty(false);
      setPendingAction(null);
      fetchAttendance(selectedSession.id, true);
    } catch (error) {
      console.error('Save attendance error:', error);
      toast.error(t('errors.INTERNAL_ERROR'));
    } finally {
      setSaving(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    handleDateChange(format(d, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    handleDateChange(format(d, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    handleDateChange(format(new Date(), 'yyyy-MM-dd'));
  };

  const stats: AttendanceStats = {
    present: attendance.filter(r => r.status === 'present').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    late: attendance.filter(r => r.status === 'late').length,
    excused: attendance.filter(r => r.status === 'excused').length,
    total: attendance.length
  };

  const filteredAttendance = attendance.filter(r =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const confirmLeave = () => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (pendingAction) {
      setIsDirty(false);
      if (pendingAction.type === 'date' && pendingAction.date) {
        setSelectedDate(pendingAction.date);
      } else if (pendingAction.type === 'session' && pendingAction.id) {
        fetchAttendance(pendingAction.id, true);
      }
      setPendingAction(null);
    }
  };

  const cancelLeave = () => {
    if (blocker.state === "blocked") blocker.reset();
    setPendingAction(null);
  };

  return {
    sessions,
    selectedSession,
    attendance,
    selectedDate,
    sessionsLoading,
    attendanceLoading,
    saving,
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
    handlePrevDay,
    handleNextDay,
    handleToday,
    confirmLeave,
    cancelLeave,
    fetchAttendance
  };
};
