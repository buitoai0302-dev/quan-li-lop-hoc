import { useNavigationPrompt } from '../hooks/useNavigationPrompt';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import PageLoading from '../components/common/PageLoading';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import type { Session, AttendanceRecord } from '../types';

import { USER_ROLES, ATTENDANCE_STATUS } from '../utils/constants';
import React from 'react';



const Attendance: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const isAttendanceEnabled = user?.tenant_settings?.menu?.attendance !== false;

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
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);

  const blocker = useNavigationPrompt(isDirty);

  useEffect(() => {
    if (isAttendanceEnabled) {
      fetchSessions();
    }
  }, [selectedDate, isAttendanceEnabled]);

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
        fetchAttendance(pendingAction.id, true);
      }
      setPendingAction(null);
    }
  };

  const cancelLeave = () => {
    if (blocker.state === "blocked") blocker.reset();
    setPendingAction(null);
  };

  if (!isAttendanceEnabled) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('attendance.disabledTitle')}
        description={user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN
          ? t('attendance.disabledAdminDesc')
          : t('attendance.disabledDesc')}
        action={
          <div className="flex gap-3">
            <button onClick={() => window.history.back()} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold">{t('common.goBack')}</button>
            {(user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN) && (
              <button onClick={() => window.location.href = '/settings'} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20">{t('settings.title')}</button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden">
      <ConfirmModal
        isOpen={!!(blocker.state === "blocked" || pendingAction)}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title={t('attendance.unsavedTitle')}
        message={t('attendance.unsavedDesc')}
        confirmText={t('common.leave')}
        cancelText={t('common.stay')}
        type="danger"
      />

      <PageHeader
        icon={ClipboardCheck}
        actions={
          <div className="flex items-center gap-2">
            {!selectedSession ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800/50">
                <CalendarIcon size={14} />
                {t('attendance.selectSession')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllAsPresent}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95 whitespace-nowrap"
                >
                  <CheckCircle size={14} />
                  <span className="hidden sm:inline">{t('attendance.quickMarkAll')}</span>
                  <span className="sm:hidden">{t('attendance.present')}</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || attendance.length === 0}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save size={14} />
                  )}
                  {t('common.save')}
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Control Bar & Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800/50 shrink-0 overflow-hidden transition-all duration-300">
        <div 
          className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors"
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <ClipboardCheck size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('attendance.stats')} & {t('common.filter')}</h3>
          </div>
          <button className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-all active:scale-95">
            {isControlsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div className={`transition-all duration-300 ease-in-out ${isControlsExpanded ? 'max-h-[500px] opacity-100 border-t border-gray-50 dark:border-slate-800/50 p-3 sm:p-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {selectedSession && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
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

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="flex items-center gap-1.5 flex-1 md:flex-none md:w-64 min-w-0">
              <button onClick={handlePrevDay} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 shrink-0 text-slate-600 dark:text-slate-300"><ChevronLeft size={16} /></button>
              <div 
                className="relative flex-1 group cursor-pointer min-w-0"
                onClick={() => {
                  const input = dateInputRef.current as any;
                  if (input) {
                    if ('showPicker' in input) input.showPicker();
                    else input.click();
                  }
                }}
              >
                <input 
                  ref={dateInputRef}
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => handleDateChange(e.target.value)} 
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg text-[10px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white cursor-pointer truncate" 
                />
                <CalendarIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <button onClick={handleNextDay} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 shrink-0 text-slate-600 dark:text-slate-300"><ChevronRight size={16} /></button>
            </div>
            <button 
              onClick={handleToday} 
              className="px-3 sm:px-4 py-2 bg-primary/5 dark:bg-primary/10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary rounded-lg border border-primary/10 hover:bg-primary/10 transition-all active:scale-95 shrink-0"
            >
              {t('common.today')}
            </button>
          </div>

          {selectedSession && (
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder={t('common.search')} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none" 
              />
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden min-h-0">
        {/* Session List */}
        <div className={`w-full lg:w-72 lg:h-full shrink-0 flex flex-col transition-all duration-300 ${isSessionsExpanded ? 'h-[200px] sm:h-[240px] lg:h-full' : 'h-12 lg:h-full'}`}>
          <Card 
            className="flex-1 flex flex-col overflow-hidden" 
            header={
              <div 
                className="flex items-center justify-between w-full cursor-pointer lg:cursor-default"
                onClick={() => window.innerWidth < 1024 && setIsSessionsExpanded(!isSessionsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={14} className="text-gray-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('attendance.sessions')}</h3>
                </div>
                <button className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-all active:scale-95 lg:hidden">
                  {isSessionsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            } 
            scrollable={isSessionsExpanded || window.innerWidth >= 1024}
          >
            <div className={`${!isSessionsExpanded && 'hidden lg:block'} p-3 space-y-2`}>
            {sessionsLoading ? <PageLoading /> : sessions.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('common.noData')}</p>
              </div>
            ) : sessions.map(s => (
              <button key={s.id} onClick={() => fetchAttendance(s.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${selectedSession?.id === s.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-600 dark:text-gray-400'}`}>
                <div className="font-bold text-sm truncate">{s.class_name}</div>
                <div className="text-[10px] opacity-70 font-medium">{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</div>
              </button>
            ))}
            </div>
          </Card>
        </div>

        {/* Student List */}
        <Card className="flex-1 min-h-0" scrollable>
          {attendanceLoading ? <PageLoading /> : !selectedSession ? <EmptyState title={t('attendance.selectSession')} description={t('attendance.selectSessionDesc')} icon={ClipboardCheck} /> : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filteredAttendance.length === 0 ? (
                 <div className="py-20">
                   <EmptyState title={t('common.noResults')} icon={Search} />
                 </div>
              ) : filteredAttendance.map(record => (
                <div key={record.student_id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 shrink-0">
                      {record.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{record.full_name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{record.email}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    {[ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.LATE, ATTENDANCE_STATUS.EXCUSED].map((status) => (
                      <button 
                        key={status} 
                        onClick={() => handleStatusChange(record.student_id, status as any)} 
                        className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-tighter transition-all border ${
                          record.status === status 
                            ? (status === ATTENDANCE_STATUS.PRESENT ? 'bg-green-500 border-green-500 text-white shadow-md' : 
                               status === ATTENDANCE_STATUS.ABSENT ? 'bg-red-500 border-red-500 text-white shadow-md' : 
                               status === ATTENDANCE_STATUS.LATE ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 
                               'bg-blue-500 border-blue-500 text-white shadow-md') 
                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 hover:border-primary/30 dark:hover:border-primary/50'
                        }`}
                      >
                        {t(`attendance.${status}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Attendance;
