import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { getAttendanceForSession, saveAttendance } from '../api/attendance.api';
import { getWeeklySchedule } from '@/features/schedule';
import toast from 'react-hot-toast';
import { format, addDays, parseISO } from 'date-fns';
import { ATTENDANCE_STATUS } from '@/utils/constants';
import { normalizeSearchStr } from '@/utils/string';
import { handleApiError } from '@/utils/errorHelper';
import type { ApiErrorData } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { AttendanceRecord, AttendanceStats, PendingAction } from '../types';
import type { Student } from '@/types/schemas';
import { useNavigationPrompt } from '@/hooks/useNavigationPrompt';
import { isDateKey, isText, useWorkflowScope, useWorkflowState } from '@/hooks/useWorkflowState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

const businessDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const useAttendance = (isAttendanceEnabled: boolean) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = useWorkflowScope();
  const [params, setParams] = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useWorkflowState(
    'attendance',
    'session',
    '',
    isText,
    false,
    params.get('sessionId') || undefined
  );
  const [selectedDate, setSelectedDate] = useWorkflowState(
    'attendance',
    'date',
    businessDate(),
    isDateKey,
    false,
    params.get('date') || undefined
  );
  const [searchTerm, setSearchTerm] = useWorkflowState('attendance', 'search', '', isText, true);
  const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>([]);
  const [version, setVersion] = useState(0);
  const [reason, setReason] = useState('');
  const [confirmedStudentIds, setConfirmedStudentIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [undo, setUndo] = useState<{ records: AttendanceRecord[]; dirty: boolean } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [desktopStatsExpanded, setDesktopStatsExpanded] = useState(true);
  const [mobileStatsExpanded, setMobileStatsExpanded] = useState(false);
  const isControlsExpanded = isDesktop ? desktopStatsExpanded : mobileStatsExpanded;
  const setIsControlsExpanded = isDesktop ? setDesktopStatsExpanded : setMobileStatsExpanded;
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(() => !selectedSessionId);
  const blocker = useNavigationPrompt(isDirty);
  useEffect(() => {
    if (isDirty) return;
    const next = new URLSearchParams(params);
    next.set('date', selectedDate);
    if (selectedSessionId) next.set('sessionId', selectedSessionId);
    else next.delete('sessionId');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [params, setParams, selectedDate, selectedSessionId, isDirty]);

  const sessionsQuery = useQuery({
    queryKey: ['sessions', scope, 'attendance', selectedDate],
    queryFn: async ({ signal }) =>
      (await getWeeklySchedule(selectedDate, selectedDate, undefined, undefined, undefined, signal))
        .sessions,
    enabled: isAttendanceEnabled && !!scope,
  });
  const attendanceQuery = useQuery({
    queryKey: ['attendance', scope, selectedSessionId],
    queryFn: ({ signal }) => getAttendanceForSession(selectedSessionId, signal),
    enabled: isAttendanceEnabled && !!scope && !!selectedSessionId,
  });
  useEffect(() => {
    if (attendanceQuery.data && !isDirty) {
      setLocalAttendance(attendanceQuery.data.attendance);
      setVersion(attendanceQuery.data.version);
    }
  }, [attendanceQuery.data, isDirty]);
  useEffect(() => {
    if (
      sessionsQuery.data &&
      selectedSessionId &&
      !isDirty &&
      !sessionsQuery.data.some((session) => session.id === selectedSessionId)
    ) {
      setSelectedSessionId('');
      setLocalAttendance([]);
    }
  }, [sessionsQuery.data, selectedSessionId, isDirty, setSelectedSessionId]);

  const resetDraft = () => {
    setIsDirty(false);
    setUndo(null);
    setReason('');
    setConfirmedStudentIds([]);
    setLocalAttendance([]);
  };
  const selectSession = (sessionId: string) => {
    resetDraft();
    setSelectedSessionId(sessionId);
    if (!isDesktop) {
      setIsSessionsExpanded(false);
      setMobileStatsExpanded(false);
    }
  };
  const policy = attendanceQuery.data?.editingPolicy;
  const saveMutation = useMutation({
    mutationFn: ({
      next: _next,
      ...payload
    }: {
      next: boolean;
      sessionId: string;
      records: { student_id: string; status: string }[];
      expectedVersion: number;
      reason: string;
      confirmedStudentIds: string[];
    }) => saveAttendance(payload.sessionId, payload.records, payload),
    onSuccess: async (_data, variables) => {
      toast.success(t('attendance.saveSuccess'));
      setIsDirty(false);
      setUndo(null);
      setReason('');
      setConfirmedStudentIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance', scope, variables.sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['work-items'] }),
        queryClient.invalidateQueries({ queryKey: ['student-profile'] }),
      ]);
      if (variables.next) {
        const { data: sessions } = await sessionsQuery.refetch();
        const next = sessions
          ?.filter(
            (session) =>
              session.id !== variables.sessionId &&
              (session.student_count || 0) > (session.attendance_count || 0)
          )
          .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id))[0];
        if (next) selectSession(next.id);
        else toast.success(t('attendance.noNextSession'));
      }
    },
    onError: (error) => handleApiError(error as AxiosError<ApiErrorData>, t),
  });
  const handleFetchAttendance = (sessionId: string) => {
    if (saveMutation.isPending) return;
    if (isDirty) {
      setPendingAction({ type: 'session', id: sessionId });
      return;
    }
    selectSession(sessionId);
  };
  const changeDate = (date: string) => {
    resetDraft();
    setSelectedDate(date);
    setSelectedSessionId('');
    setIsSessionsExpanded(true);
  };
  const handleDateChange = (date: string) => {
    if (!isDateKey(date) || saveMutation.isPending) return;
    if (isDirty) setPendingAction({ type: 'date', date });
    else changeDate(date);
  };
  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    if (!policy?.editable || saveMutation.isPending) return;
    setIsDirty(true);
    setUndo(null);
    setLocalAttendance((records) =>
      records.map((record) => (record.student_id === studentId ? { ...record, status } : record))
    );
  };
  const unmarkedCount = localAttendance.filter(
    (record) => record.status === ATTENDANCE_STATUS.NONE
  ).length;
  const handleMarkAllAsPresent = () => {
    if (!policy?.editable || !unmarkedCount || saveMutation.isPending) return;
    setUndo({ records: localAttendance, dirty: isDirty });
    setIsDirty(true);
    setLocalAttendance((records) =>
      records.map((record) =>
        record.status === ATTENDANCE_STATUS.NONE
          ? { ...record, status: ATTENDANCE_STATUS.PRESENT }
          : record
      )
    );
  };
  const handleUndo = () => {
    if (undo && !saveMutation.isPending) {
      setLocalAttendance(undo.records);
      setIsDirty(undo.dirty);
      setUndo(null);
    }
  };
  const handleSave = (next = false) => {
    if (!policy?.editable || saveMutation.isPending) return;
    if (policy.reasonRequired && !reason.trim()) {
      toast.error(t('errors.ATTENDANCE_REASON_REQUIRED'));
      return;
    }
    const records = localAttendance
      .filter((record) => record.status !== ATTENDANCE_STATUS.NONE)
      .map(({ student_id, status }) => ({ student_id, status }));
    if (!records.length) return;
    saveMutation.mutate({
      next,
      sessionId: selectedSessionId,
      records,
      expectedVersion: version,
      reason,
      confirmedStudentIds: confirmedStudentIds.filter((id) =>
        records.some((record) => record.student_id === id)
      ),
    });
  };
  const confirmStudent = (student: Student) => {
    if (
      !policy?.canConfirmStudents ||
      saveMutation.isPending ||
      localAttendance.some((record) => record.student_id === student.id)
    )
      return;
    setLocalAttendance((records) => [
      ...records,
      {
        student_id: student.id,
        full_name: student.full_name,
        email: student.email,
        status: ATTENDANCE_STATUS.NONE,
        attendance_id: null,
        marked_at: null,
      },
    ]);
    setConfirmedStudentIds((ids) => [...ids, student.id]);
    setIsDirty(true);
    setUndo(null);
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
        (record) =>
          normalizeSearchStr(record.full_name).includes(normalizeSearchStr(searchTerm)) ||
          (record.email &&
            normalizeSearchStr(record.email).includes(normalizeSearchStr(searchTerm)))
      ),
    [localAttendance, searchTerm]
  );
  const confirmLeave = () => {
    if (blocker.state === 'blocked') {
      resetDraft();
      blocker.proceed();
    } else if (pendingAction?.type === 'date' && pendingAction.date) changeDate(pendingAction.date);
    else if (pendingAction?.id) selectSession(pendingAction.id);
    setPendingAction(null);
  };
  const cancelLeave = () => {
    if (blocker.state === 'blocked') blocker.reset();
    setPendingAction(null);
  };
  return {
    sessions: sessionsQuery.data || [],
    selectedSession: attendanceQuery.data?.session || null,
    attendance: localAttendance,
    selectedDate,
    isReadOnly: !policy?.editable,
    isFutureDate: policy?.isFuture ?? false,
    sessionsLoading: sessionsQuery.isLoading,
    attendanceLoading: attendanceQuery.isLoading,
    sessionsQuery,
    attendanceQuery,
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
    unmarkedCount,
    handleUndo,
    canUndo: !!undo,
    policy,
    reason,
    setReason,
    confirmStudent,
    reloadAttendance: async () => {
      resetDraft();
      await attendanceQuery.refetch();
    },
    handlePrevDay: () =>
      handleDateChange(format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd')),
    handleNextDay: () => handleDateChange(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd')),
    handleToday: () => handleDateChange(businessDate()),
    confirmLeave,
    cancelLeave,
    fetchAttendance: handleFetchAttendance,
  };
};
