import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardCheck, Search } from 'lucide-react';
import { Card } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';
import EmptyState from '@/components/common/EmptyState';
import { ATTENDANCE_STATUS } from '@/utils/constants';
import type { AttendanceRecord, Session } from '../types';

const STATUS_BUTTON_COLORS = {
  [ATTENDANCE_STATUS.PRESENT]:
    'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200',
  [ATTENDANCE_STATUS.ABSENT]:
    'border-red-300 bg-red-50 text-red-800 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-200',
  [ATTENDANCE_STATUS.LATE]:
    'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200',
  [ATTENDANCE_STATUS.EXCUSED]:
    'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-200',
};

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
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-indigo-700 dark:text-indigo-200">
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
                <div className="grid grid-cols-2 gap-1.5 @min-[29rem]/attendance-list:grid-cols-4 @min-[42rem]/attendance-list:w-[27rem] @min-[42rem]/attendance-list:shrink-0">
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
                      className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold leading-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default lg:@min-[42rem]/attendance-list:min-h-9 ${
                        changedStatus?.studentId === record.student_id
                          ? 'motion-safe:transition-colors motion-safe:duration-150'
                          : ''
                      } ${
                        record.status === status
                          ? STATUS_BUTTON_COLORS[status]
                          : 'border-slate-200 bg-white text-slate-700 enabled:hover:border-slate-400 enabled:hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:enabled:hover:border-slate-500 dark:enabled:hover:bg-slate-800'
                      }`}
                    >
                      <Check
                        aria-hidden="true"
                        size={11}
                        className={`shrink-0 ${record.status === status ? '' : 'invisible'} ${
                          changedStatus?.studentId === record.student_id &&
                          changedStatus.status === status
                            ? 'motion-safe:animate-[attendance-check-in_160ms_ease-out]'
                            : ''
                        }`}
                      />
                      <span className="@min-[42rem]/attendance-list:whitespace-nowrap">
                        {t(`attendance.${status}`)}
                      </span>
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
