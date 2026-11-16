import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/utils/constants';

import EmptyState from '@/components/common/EmptyState';
import PageError from '@/components/common/PageError';
import ConfirmModal from '@/components/common/ConfirmModal';
import ExportMenu from '@/components/common/ExportMenu';

// Local components
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import AttendanceHeader from '@/features/attendance/components/AttendanceHeader';
import AttendanceControls from '@/features/attendance/components/AttendanceControls';
import SessionList from '@/features/attendance/components/SessionList';
import StudentList from '@/features/attendance/components/StudentList';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';
import type { AttendanceRecord } from '@/features/attendance/types';
import { useWorkflowScroll } from '@/hooks/useWorkflowState';
import HistoricalAttendance from './HistoricalAttendance';
import AttendanceHistory from './AttendanceHistory';

const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isAttendanceEnabled = user?.tenant_settings?.menu?.attendance !== false;
  const [showHistory, setShowHistory] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  const {
    sessions,
    selectedSession,
    attendance,
    selectedDate,
    sessionsLoading,
    attendanceLoading,
    sessionsQuery,
    attendanceQuery,
    saving,
    searchTerm,
    setSearchTerm,
    pendingAction,
    isControlsExpanded,
    setIsControlsExpanded,
    isSessionsExpanded,
    setIsSessionsExpanded,
    blocker,
    isReadOnly,
    isFutureDate,
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
    fetchAttendance,
    unmarkedCount,
    canUndo,
    handleUndo,
    policy,
    reason,
    setReason,
    confirmStudent,
    reloadAttendance,
  } = useAttendance(isAttendanceEnabled);
  const scrollRef = useWorkflowScroll('attendance', !attendanceLoading && !sessionsLoading);

  const handleExportExcel = () => {
    if (!filteredAttendance.length) return;
    const columns: ExportColumn<AttendanceRecord>[] = [
      { header: t('attendance.studentName'), accessor: 'full_name' },
      { header: 'Email', accessor: 'email' },
      { header: t('attendance.status'), accessor: (r) => t(`attendance.${r.status}`) },
      {
        header: t('attendance.markedAt'),
        accessor: (r) => (r.marked_at ? new Date(r.marked_at).toLocaleString('vi-VN') : ''),
      },
    ];
    const dateLabel = selectedDate
      ? new Date(selectedDate).toLocaleDateString('vi-VN').replace(/\//g, '-')
      : '';
    exportToExcel(filteredAttendance, columns, `${t('export.attendance')}_${dateLabel}`);
  };

  const handleExportPDF = async () => {
    if (!filteredAttendance.length) return;
    const columns: ExportColumn<AttendanceRecord>[] = [
      { header: t('attendance.studentName'), accessor: 'full_name' },
      { header: 'Email', accessor: 'email' },
      { header: t('attendance.status'), accessor: (r) => t(`attendance.${r.status}`) },
      {
        header: t('attendance.markedAt'),
        accessor: (r) => (r.marked_at ? new Date(r.marked_at).toLocaleString('vi-VN') : ''),
      },
    ];
    const dateLabel = selectedDate
      ? new Date(selectedDate).toLocaleDateString('vi-VN').replace(/\//g, '-')
      : '';
    const sessionLabel = selectedSession
      ? `${selectedSession.class_name ?? ''} - ${selectedSession.start_time}`
      : '';
    await exportToPDF(
      filteredAttendance,
      columns,
      `${t('export.attendance')}_${dateLabel}`,
      `${t('export.attendance')} | ${sessionLabel} | ${dateLabel}`
    );
  };

  if (!isAttendanceEnabled) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('attendance.disabledTitle')}
        description={
          user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN
            ? t('attendance.disabledAdminDesc')
            : t('attendance.disabledDesc')
        }
        action={
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold"
            >
              {t('common.goBack')}
            </button>
            {(user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN) && (
              <button
                onClick={() => (window.location.href = '/settings')}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20"
              >
                {t('settings.title')}
              </button>
            )}
          </div>
        }
      />
    );
  }

  const failedQueries = [sessionsQuery, attendanceQuery].filter(
    (query) => query.isError && query.data === undefined
  );
  if (failedQueries.length > 0)
    return (
      <PageError
        retrying={failedQueries.some((query) => query.isFetching)}
        onRetry={() => Promise.all(failedQueries.map((query) => query.refetch()))}
      />
    );

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:overflow-hidden"
    >
      <ConfirmModal
        isOpen={confirmReload}
        onClose={() => setConfirmReload(false)}
        onConfirm={() => {
          setConfirmReload(false);
          void reloadAttendance();
        }}
        title={t('attendance.reloadTitle')}
        message={t('attendance.reloadNotice')}
      />
      {showHistory && selectedSession && (
        <AttendanceHistory sessionId={selectedSession.id} onClose={() => setShowHistory(false)} />
      )}
      <ConfirmModal
        isOpen={!!(blocker.state === 'blocked' || pendingAction)}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title={t('attendance.unsavedTitle')}
        message={t('attendance.unsavedDesc')}
        confirmText={t('common.leave')}
        cancelText={t('common.stay')}
        type="danger"
      />

      <AttendanceControls
        isControlsExpanded={isControlsExpanded}
        setIsControlsExpanded={setIsControlsExpanded}
        selectedSession={selectedSession}
        stats={stats}
        selectedDate={selectedDate}
        isReadOnly={isReadOnly}
        isFutureDate={isFutureDate}
        handlePrevDay={handlePrevDay}
        handleNextDay={handleNextDay}
        handleToday={handleToday}
        handleDateChange={handleDateChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateInputRef={dateInputRef}
        viewActions={
          <ExportMenu
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={filteredAttendance.length === 0}
            align="responsive"
          />
        }
        sessionActions={
          selectedSession && (
            <div className="flex flex-wrap items-center gap-x-3 text-xs font-medium">
              {user?.role !== USER_ROLES.TEACHER && (
                <button
                  type="button"
                  className="min-h-11 rounded text-slate-600 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-300 sm:min-h-9"
                  onClick={() => setShowHistory(true)}
                >
                  {t('attendance.history')}
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                className="min-h-11 rounded text-slate-600 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 dark:text-slate-300 sm:min-h-9"
                onClick={() => setConfirmReload(true)}
              >
                {t('attendance.reloadTitle')}
              </button>
            </div>
          )
        }
        headerActions={
          <AttendanceHeader
            selectedSession={selectedSession}
            attendance={attendance}
            saving={saving}
            isReadOnly={isReadOnly}
            isFutureDate={isFutureDate}
            handleMarkAllAsPresent={handleMarkAllAsPresent}
            handleSave={() => handleSave()}
            handleSaveNext={() => handleSave(true)}
            unmarkedCount={unmarkedCount}
            canUndo={canUndo}
            handleUndo={handleUndo}
          />
        }
      />

      {policy?.reasonRequired && (
        <HistoricalAttendance
          reason={reason}
          setReason={setReason}
          existingIds={attendance.map((record) => record.student_id)}
          confirmStudent={confirmStudent}
          disabled={saving}
        />
      )}
      <div className="flex flex-none flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
        <SessionList
          sessions={sessions}
          selectedSession={selectedSession}
          sessionsLoading={sessionsLoading}
          isSessionsExpanded={isSessionsExpanded}
          setIsSessionsExpanded={setIsSessionsExpanded}
          onSelectSession={(id) => fetchAttendance(id)}
        />

        <StudentList
          attendanceLoading={attendanceLoading}
          selectedSession={selectedSession}
          filteredAttendance={filteredAttendance}
          isReadOnly={isReadOnly || saving}
          handleStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
