import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardCheck, Search } from 'lucide-react';
import { Card } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';
import EmptyState from '@/components/common/EmptyState';
import { ATTENDANCE_STATUS } from '@/utils/constants';
import type { AttendanceRecord, Session } from '../types';

interface StudentListProps {
  attendanceLoading: boolean;
  selectedSession: Session | null;
  filteredAttendance: AttendanceRecord[];
  isReadOnly: boolean;
  handleStatusChange: (studentId: string, status: AttendanceRecord['status']) => void;
}

const StudentList: React.FC<StudentListProps> = ({
  attendanceLoading,
  selectedSession,
  filteredAttendance,
  isReadOnly,
  handleStatusChange,
}) => {
  const { t } = useTranslation();
  const [changedStatus, setChangedStatus] = React.useState<{
    studentId: string;
    status: AttendanceRecord['status'];
  } | null>(null);

  return (
    <Card className="@container/attendance-list flex-1 min-h-0" scrollable>
      {attendanceLoading ? (
        <PageLoading />
      ) : !selectedSession ? (
        <EmptyState
          title={t('attendance.selectSession')}
          description={t('attendance.selectSessionDesc')}
          icon={ClipboardCheck}
        />
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {filteredAttendance.length === 0 ? (
            <div className="py-20">
              <EmptyState title={t('common.noResults')} icon={Search} />
            </div>
          ) : (
            filteredAttendance.map((record) => (
              <div
                key={record.student_id}
                className="flex flex-col justify-between gap-3 p-3 sm:p-4 @min-[42rem]/attendance-list:flex-row @min-[42rem]/attendance-list:items-center hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 shrink-0">
                    {record.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {record.full_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {record.email}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 @min-[24rem]/attendance-list:grid-cols-4 @min-[42rem]/attendance-list:shrink-0">
                  {[
                    ATTENDANCE_STATUS.PRESENT,
                    ATTENDANCE_STATUS.ABSENT,
                    ATTENDANCE_STATUS.LATE,
                    ATTENDANCE_STATUS.EXCUSED,
                  ].map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={record.status === status}
                      onClick={() => {
                        if (record.status === status) return;
                        setChangedStatus({ studentId: record.student_id, status });
                        handleStatusChange(record.student_id, status);
                      }}
                      disabled={isReadOnly}
                      className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default sm:px-3 ${
                        changedStatus?.studentId === record.student_id
                          ? 'motion-safe:transition-colors motion-safe:duration-150'
                          : ''
                      } ${
                        record.status === status
                          ? status === ATTENDANCE_STATUS.PRESENT
                            ? 'bg-emerald-700 border-emerald-700 text-white'
                            : status === ATTENDANCE_STATUS.ABSENT
                              ? 'bg-red-700 border-red-700 text-white'
                              : status === ATTENDANCE_STATUS.LATE
                                ? 'bg-amber-800 border-amber-800 text-white'
                                : 'bg-blue-700 border-blue-700 text-white'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 enabled:hover:border-primary dark:enabled:hover:border-indigo-400'
                      }`}
                    >
                      {record.status === status && (
                        <Check
                          aria-hidden="true"
                          size={11}
                          className={`shrink-0 ${
                            changedStatus?.studentId === record.student_id &&
                            changedStatus.status === status
                              ? 'motion-safe:animate-[attendance-check-in_160ms_ease-out]'
                              : ''
                          }`}
                        />
                      )}
                      {t(`attendance.${status}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
};

export default StudentList;
