import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/utils/constants';

import EmptyState from '@/components/common/EmptyState';
import ConfirmModal from '@/components/common/ConfirmModal';

// Local components
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import AttendanceHeader from '@/features/attendance/components/AttendanceHeader';
import AttendanceControls from '@/features/attendance/components/AttendanceControls';
import SessionList from '@/features/attendance/components/SessionList';
import StudentList from '@/features/attendance/components/StudentList';
import ExportMenu from '@/components/common/ExportMenu';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';
import type { AttendanceRecord } from '@/features/attendance/types';

const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isAttendanceEnabled = user?.tenant_settings?.menu?.attendance !== false;

  const {
    sessions,
    selectedSession,
    attendance,
    selectedDate,
    sessionsLoading,
    attendanceLoading,
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
  } = useAttendance(isAttendanceEnabled);

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
    const dateLabel = selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN') : '';
    exportToExcel(filteredAttendance, columns, `${t('export.attendance')}_${dateLabel}`);
  };

  const handleExportPDF = () => {
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
    const dateLabel = selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN') : '';
    const sessionLabel = selectedSession
      ? `${selectedSession.class_name ?? ''} - ${selectedSession.start_time}`
      : '';
    exportToPDF(
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

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden">
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
        headerActions={
          <div className="flex items-center gap-2">
            <ExportMenu
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              disabled={filteredAttendance.length === 0 || !selectedSession}
            />
            <AttendanceHeader
              selectedSession={selectedSession}
              attendance={attendance}
              saving={saving}
              isReadOnly={isReadOnly}
              isFutureDate={isFutureDate}
              handleMarkAllAsPresent={handleMarkAllAsPresent}
              handleSave={handleSave}
            />
          </div>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden min-h-0">
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
          isReadOnly={isReadOnly}
          handleStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
