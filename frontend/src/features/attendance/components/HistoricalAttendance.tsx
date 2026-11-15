import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const query = useQuery({
    queryKey: ['students', scope, 'historical-confirmation'],
    queryFn: ({ signal }) => getStudents(undefined, signal),
    enabled: adding,
  });
  return (
    <div className="max-h-[35dvh] shrink-0 space-y-2 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
      <label className="flex flex-col gap-1">
        <span>{t('attendance.reason')} *</span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={disabled}
          maxLength={1000}
          className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      <button
        type="button"
        onClick={() => setAdding((value) => !value)}
        aria-expanded={adding}
        className="min-h-10 text-primary"
      >
        {t('attendance.addHistoricalStudent')}
      </button>
      {adding && (
        <div className="space-y-2">
          <p className="text-xs">{t('attendance.historicalRosterNotice')}</p>
          <select
            aria-label={t('attendance.addHistoricalStudent')}
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setConfirmed(false);
            }}
            disabled={disabled || query.isPending}
            className="min-h-11 w-full rounded-lg border bg-white px-2 dark:bg-slate-800"
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
            className="min-h-11 rounded-lg bg-primary px-3 text-white disabled:opacity-50"
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
