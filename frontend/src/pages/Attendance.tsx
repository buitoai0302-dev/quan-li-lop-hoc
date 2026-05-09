import { useNavigationPrompt } from '../hooks/useNavigationPrompt';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState, useRef } from 'react';

interface Session {
  id: string;
  class_id: string;
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  student_id: string;
  full_name: string;
  email: string;
  attendance_id: string | null;
  status: 'present' | 'absent' | 'late' | 'excused' | 'none';
  marked_at: string | null;
}

const Attendance: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAttendanceEnabled = user?.tenant_settings?.menu?.attendance !== false;

  if (!isAttendanceEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] flex items-center justify-center mb-6 text-amber-500 shadow-xl shadow-amber-500/10">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
          {t('attendance.disabledTitle', 'Tính năng chưa được kích hoạt')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
          {user?.role === 'admin' || user?.role === 'super_admin'
            ? t('attendance.disabledAdminDesc', 'Bạn có thể kích hoạt tính năng điểm danh trong phần Cấu hình Menu tại trang Cài đặt.')
            : t('attendance.disabledDesc', 'Vui lòng liên hệ quản trị viên trung tâm để kích hoạt tính năng điểm danh trong phần Cài đặt.')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            {t('common.goBack', 'Quay lại')}
          </button>
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <button
              onClick={() => window.location.href = '/settings'}
              className="px-8 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              {t('settings.title', 'Cài đặt')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const dateInputRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'session' | 'date', id?: string, date?: string } | null>(null);

  const blocker = useNavigationPrompt(isDirty);

  useEffect(() => {
    fetchSessions();
  }, [selectedDate]);

  const handleDateChange = (newDate: string) => {
    if (isDirty) {
      setPendingAction({ type: 'date', date: newDate });
    } else {
      setSelectedDate(newDate);
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get(`/schedule/weekly?startDate=${selectedDate}&endDate=${selectedDate}`);
      setSessions(res.data.data.sessions);

      // If we already have a selected session, refresh its attendance
      if (selectedSession) {
        const stillExists = res.data.data.sessions.find((s: Session) => s.id === selectedSession.id);
        if (stillExists) {
          fetchAttendance(selectedSession.id);
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
  };

  const fetchAttendance = async (sessionId: string, force = false) => {
    if (isDirty && !force) {
      setPendingAction({ type: 'session', id: sessionId });
      return;
    }
    setIsDirty(false);
    setPendingAction(null);
    console.log(`Fetching attendance for session: ${sessionId}`);
    try {
      setAttendanceLoading(true);
      const res = await api.get(`/attendance/session/${sessionId}`);
      setAttendance(res.data.attendance);
      setSelectedSession(res.data.session);
    } catch (error) {
      console.error('Fetch attendance error:', error);
      toast.error(t('errors.INTERNAL_ERROR'));
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    console.log(`Changing status for student ${studentId} to ${status}`);
    setIsDirty(true);
    setAttendance(prev => {
      const updated = prev.map(record =>
        record.student_id === studentId ? { ...record, status } : record
      );
      return updated;
    });
  };

  const handleMarkAllAsPresent = () => {
    console.log('Marking all as present');
    setIsDirty(true);
    setAttendance(prev => prev.map(record => ({ ...record, status: 'present' })));
  };

  const handleSave = async () => {
    if (!selectedSession) return;

    try {
      setSaving(true);
      const records = attendance
        .filter(r => r.status !== 'none')
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

  const stats = {
    present: attendance.filter(r => r.status === 'present').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    late: attendance.filter(r => r.status === 'late').length,
    excused: attendance.filter(r => r.status === 'excused').length,
    total: attendance.length
  };

  const filteredAttendance = attendance.filter(r =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmLeave = () => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (pendingAction) {
      setIsDirty(false);
      if (pendingAction.type === 'date' && pendingAction.date) {
        setSelectedDate(pendingAction.date);
      } else if (pendingAction.type === 'session' && pendingAction.id) {
        const sid = pendingAction.id;
        setPendingAction(null);
        setTimeout(() => fetchAttendance(sid), 0);
        return;
      }
      setPendingAction(null);
    }
  };

  const cancelLeave = () => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
    setPendingAction(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-1 md:p-1 h-full overflow-auto lg:overflow-hidden flex flex-col gap-4 lg:gap-6 transition-all duration-300 custom-scrollbar">
      {/* Confirmation Modal */}
      {(blocker.state === "blocked" || pendingAction) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-w-md w-full animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={40} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                {t('attendance.unsavedTitle', 'Unsaved Changes!')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
                {t('attendance.unsavedDesc', 'You have unsaved attendance data. If you leave now, your changes will be lost.')}
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={cancelLeave}
                  className="px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {t('common.stay', 'Stay Here')}
                </button>
                <button
                  onClick={confirmLeave}
                  className="px-6 py-4 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut size={18} />
                  {t('common.leave', 'Leave')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md shrink-0">
              <ClipboardCheck className="text-primary" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base lg:text-xl font-black text-gray-900 dark:text-white truncate">
                {t('attendance.title')}
              </h1>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                {selectedSession
                  ? `${selectedSession.class_name} • ${selectedSession.start_time?.substring(0, 5)} - ${selectedSession.end_time?.substring(0, 5)}`
                  : t('attendance.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {!selectedSession ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800/50">
                <CalendarIcon size={14} />
                {t('attendance.selectSession')}
              </div>
            ) : (
              <>
                <button
                  onClick={handleMarkAllAsPresent}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95"
                >
                  <CheckCircle size={14} />
                  {t('attendance.quickMarkAll')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || attendance.length === 0}
                  className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white rounded-lg font-black text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {saving ? t('common.saving') : t('attendance.save')}
                  <Save size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Summary (Show only when session is selected) */}
        {selectedSession && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <div className="bg-green-50/50 dark:bg-green-900/10 p-2 lg:p-3 rounded-lg border border-green-100 dark:border-green-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-0.5">{t('attendance.present')}</div>
              <div className="text-base lg:text-xl font-black text-green-600">{stats.present} <span className="text-[10px] font-medium text-green-400">/ {stats.total}</span></div>
            </div>
            <div className="bg-red-50/50 dark:bg-red-900/10 p-2 lg:p-3 rounded-lg border border-red-100 dark:border-red-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-red-600/60 uppercase tracking-widest mb-0.5">{t('attendance.absent')}</div>
              <div className="text-base lg:text-xl font-black text-red-600">{stats.absent}</div>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-2 lg:p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-0.5">{t('attendance.late')}</div>
              <div className="text-base lg:text-xl font-black text-amber-600">{stats.late}</div>
            </div>
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 lg:p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <div className="text-[8px] lg:text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-0.5">{t('attendance.excused')}</div>
              <div className="text-base lg:text-xl font-black text-blue-600">{stats.excused}</div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6 flex-1 lg:min-h-0">
        {/* Sidebar: Lịch học (Order: 1 on mobile, 1 on desktop) */}
        <div className="lg:col-span-1 order-1 lg:order-1 h-auto lg:h-full lg:min-h-0 overflow-hidden">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col h-full overflow-hidden">
            <div className="flex flex-col gap-3 mb-5 shrink-0">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon size={16} className="text-primary" />
                {t('menu.teachingSchedule')}
              </h3>

              <div className="grid grid-cols-[36px_1fr_36px] items-center gap-1.5 w-full">
                <button
                  onClick={handlePrevDay}
                  className="w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-primary/10 hover:text-primary transition-all shadow-sm shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>
                <div
                  className="relative group min-w-0 cursor-pointer"
                  onClick={() => {
                    try {
                      (dateInputRef.current as any)?.showPicker();
                    } catch (e) {
                      dateInputRef.current?.focus();
                    }
                  }}
                >
                  <CalendarIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors hidden sm:block" />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-2 sm:pl-8 pr-2 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleNextDay}
                  className="w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-primary/10 hover:text-primary transition-all shadow-sm shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={handleToday}
                className="w-full py-2 bg-primary/5 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-md transition-all border border-primary/10"
              >
                {t('common.today')}
              </button>
            </div>

            <div className="space-y-2 lg:flex-1 max-h-[300px] lg:max-h-none overflow-y-auto no-scrollbar relative">
              {sessionsLoading && sessions.length === 0 ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <CalendarIcon size={20} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400">{t('common.noData')}</p>
                </div>
              ) : (
                <div className={`space-y-2 transition-opacity duration-300 ${sessionsLoading ? 'opacity-50' : 'opacity-100'}`}>
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => fetchAttendance(session.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${selectedSession?.id === session.id
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 hover:border-primary/30'
                        }`}
                    >
                      <div className={`font-bold text-sm mb-0.5 truncate ${selectedSession?.id === session.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                        {session.class_name}
                      </div>
                      <div className={`text-[10px] font-medium ${selectedSession?.id === session.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Danh sách học sinh (Order: 2 on mobile, 2 on desktop) */}
        <div className="lg:col-span-3 order-2 lg:order-2 flex flex-col min-h-[400px] lg:min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col h-full relative">
            {attendanceLoading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-[1px] z-50 flex items-center justify-center animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-primary">{t('common.loading')}...</span>
                </div>
              </div>
            )}
            {!selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                  <ClipboardCheck className="text-primary/20" size={32} />
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white mb-1">{t('attendance.selectSession')}</h4>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-xs font-medium leading-relaxed">
                  {t('attendance.selectSessionDesc')}
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder={t('common.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all font-medium text-xs lg:text-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-0">
                  {/* Desktop Table View */}
                  <table className="w-full hidden md:table">
                    <thead className="bg-gray-50/80 dark:bg-gray-700/50 backdrop-blur sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.student')}</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {filteredAttendance.map(record => (
                        <tr key={record.student_id} className="group hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-xs border border-primary/10">
                                {record.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{record.full_name}</div>
                                <div className="text-[10px] font-medium text-gray-400 truncate">{record.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleStatusChange(record.student_id, 'present')}
                                title={t('attendance.present')}
                                className={`p-2 rounded-lg transition-all ${record.status === 'present' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-green-500/10 hover:text-green-500'}`}
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(record.student_id, 'absent')}
                                title={t('attendance.absent')}
                                className={`p-2 rounded-lg transition-all ${record.status === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-500'}`}
                              >
                                <XCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(record.student_id, 'late')}
                                title={t('attendance.late')}
                                className={`p-2 rounded-lg transition-all ${record.status === 'late' ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-amber-500/10 hover:text-amber-500'}`}
                              >
                                <Clock size={18} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(record.student_id, 'excused')}
                                title={t('attendance.excused')}
                                className={`p-2 rounded-lg transition-all ${record.status === 'excused' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-blue-500/10 hover:text-blue-500'}`}
                              >
                                <AlertCircle size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4 pb-4">
                    {filteredAttendance.map(record => (
                      <div key={record.student_id} className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/10">
                            {record.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{record.full_name}</h4>
                            <p className="text-[10px] text-gray-500 truncate">{record.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            onClick={() => handleStatusChange(record.student_id, 'present')}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${record.status === 'present' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}
                          >
                            <CheckCircle size={18} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('attendance.present')}</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.student_id, 'absent')}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${record.status === 'absent' ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}
                          >
                            <XCircle size={18} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('attendance.absent')}</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.student_id, 'late')}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${record.status === 'late' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}
                          >
                            <Clock size={18} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('attendance.late')}</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.student_id, 'excused')}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${record.status === 'excused' ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}
                          >
                            <AlertCircle size={18} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('attendance.excused')}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
