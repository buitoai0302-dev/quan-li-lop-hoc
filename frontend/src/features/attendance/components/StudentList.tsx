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
    <Card className="flex-1 min-h-0" scrollable>
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
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 shrink-0">
                    {record.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {record.full_name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{record.email}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
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
                      className={`inline-flex flex-1 items-center justify-center gap-0.5 rounded-lg border px-1.5 py-2 text-[9px] font-bold uppercase tracking-tight disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:gap-1 sm:px-3 sm:text-[10px] ${
                        changedStatus?.studentId === record.student_id
                          ? 'motion-safe:transition-colors motion-safe:duration-150'
                          : ''
                      } ${
                        record.status === status
                          ? status === ATTENDANCE_STATUS.PRESENT
                            ? 'bg-green-500 border-green-500 text-white shadow-md'
                            : status === ATTENDANCE_STATUS.ABSENT
                              ? 'bg-red-500 border-red-500 text-white shadow-md'
                              : status === ATTENDANCE_STATUS.LATE
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                : 'bg-blue-500 border-blue-500 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 hover:border-primary/30 dark:hover:border-primary/50'
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
