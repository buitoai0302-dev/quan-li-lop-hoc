import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { getStudents } from '@/features/students/api/students.api';
import { useWorkflowScope } from '@/hooks/useWorkflowState';
import type { Student } from '@/types/schemas';

export default function HistoricalAttendance({
  reason,
  setReason,
  existingIds,
  confirmStudent,
  disabled,
}: {
  reason: string;
  setReason: (value: string) => void;
  existingIds: string[];
  confirmStudent: (student: Student) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const scope = useWorkflowScope();
  const confirmPanelId = useId();
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const query = useQuery({
    queryKey: ['students', scope, 'historical-confirmation'],
    queryFn: ({ signal }) => getStudents(undefined, signal),
    enabled: adding,
  });
  return (
    <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20 lg:max-h-[35dvh] lg:overflow-y-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:gap-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t('attendance.reason')} *
          </span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={disabled}
            aria-required="true"
            maxLength={1000}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:min-h-9 sm:text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          aria-expanded={adding}
          aria-controls={adding ? confirmPanelId : undefined}
          aria-label={t('attendance.addHistoricalStudent')}
          title={t('attendance.addHistoricalStudent')}
          className="inline-flex size-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-primary hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary aria-expanded:border-primary/35 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300 sm:h-9 sm:w-auto sm:px-3"
        >
          <UserPlus aria-hidden="true" size={17} />
          <span className="hidden sm:inline">{t('attendance.addHistoricalStudent')}</span>
        </button>
      </div>
      {adding && (
        <div
          id={confirmPanelId}
          className="mt-3 space-y-2 border-t border-amber-200 pt-3 dark:border-amber-900"
        >
          <p className="text-xs">{t('attendance.historicalRosterNotice')}</p>
          <select
            aria-label={t('attendance.addHistoricalStudent')}
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setConfirmed(false);
            }}
            disabled={disabled || query.isPending}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:min-h-9"
          >
            <option value="">{t('attendance.chooseStudent')}</option>
            {query.data
              ?.filter((student) => !existingIds.includes(student.id))
              .map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} {student.email}
                </option>
              ))}
          </select>
          {query.isError && (
            <button type="button" onClick={() => void query.refetch()}>
              {t('common.retry')}
            </button>
          )}
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={disabled}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>{t('attendance.confirmHistoricalStudent')}</span>
          </label>
          <button
            type="button"
            disabled={!selectedId || !confirmed || disabled}
            className="min-h-11 rounded-lg bg-indigo-600 px-3 text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 sm:min-h-9"
            onClick={() => {
              const student = query.data?.find((item) => item.id === selectedId);
              if (student) {
                confirmStudent(student);
                setSelectedId('');
                setConfirmed(false);
              }
            }}
          >
            {t('common.add')}
          </button>
        </div>
      )}
    </div>
  );
}
