import { useEffect, useRef } from 'react';
import { Calendar, Clock, Copy, MapPin, Plus, Trash2, User } from 'lucide-react';
import { Button, Input, Select } from '@/components/common/UI';
import ActionHint from '@/components/common/ActionHint';
import type { ClassData, Room, Teacher } from '@/types';
import type { TFunction } from 'i18next';

export interface SessionDraft {
  classId: string;
  roomId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export type SessionDraftRow = Omit<SessionDraft, 'classId'> & { id: string };
export type SessionBatchError = { rowId: string; message: string };

interface Props {
  classId: string;
  rows: SessionDraftRow[];
  maxBatchSessions: number;
  classes: ClassData[];
  rooms: Room[];
  teachers: Teacher[];
  onClassChange: (id: string) => void;
  onRowsChange: (rows: SessionDraftRow[]) => void;
  error: SessionBatchError | null;
  t: TFunction;
}

export default function SessionBatchFields({
  classId,
  rows,
  maxBatchSessions,
  classes,
  rooms,
  teachers,
  onClassChange,
  onRowsChange,
  error,
  t,
}: Props) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  const branchId = classes.find((cls) => cls.id === classId)?.branch_id;
  const availableRooms = rooms.filter(
    (room) => room.is_active !== false && (!branchId || room.branch_id === branchId)
  );
  const availableTeachers = teachers.filter(
    (teacher) => teacher.is_active !== false && (!branchId || teacher.branch_id === branchId)
  );

  useEffect(() => {
    if (error) {
      errorRef.current?.focus({ preventScroll: true });
      errorRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [error]);

  const update = (rowId: string, field: keyof Omit<SessionDraftRow, 'id'>, value: string) =>
    onRowsChange(rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));

  const duplicate = (index: number) => {
    const row = { ...rows[index], id: crypto.randomUUID(), sessionDate: '' };
    onRowsChange([...rows.slice(0, index + 1), row, ...rows.slice(index + 1)]);
  };

  return (
    <div className="space-y-3 text-slate-700 dark:text-slate-200">
      <label className="block space-y-1 text-sm font-semibold">
        <span>{t('schedule.class')}</span>
        <Select required value={classId} onChange={(event) => onClassChange(event.target.value)}>
          <option value="" disabled>
            ---
          </option>
          {classes
            .filter((cls) => cls.status !== 'cancelled')
            .map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
        </Select>
      </label>

      <div className="max-h-[min(50dvh,32rem)] space-y-2 overflow-y-auto overscroll-y-contain p-1">
        {rows.map((row, index) => (
          <fieldset
            key={row.id}
            className={`@container min-w-0 rounded-xl border px-2.5 pb-2.5 ${error?.rowId === row.id ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <legend className="sr-only">{t('classes.recurringSlot', { number: index + 1 })}</legend>
            <div className="flex items-center justify-between gap-2">
              <span
                aria-hidden="true"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                {t('classes.recurringSlot', { number: index + 1 })}
              </span>
              <div className="flex items-center">
                <ActionHint label={t('schedule.duplicateSession')} showTouchLabel={false}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-11 text-indigo-700 dark:text-indigo-300 sm:size-9"
                    disabled={rows.length >= maxBatchSessions}
                    onClick={() => duplicate(index)}
                  >
                    <Copy size={16} aria-hidden="true" />
                  </Button>
                </ActionHint>
                <ActionHint label={t('common.delete')} showTouchLabel={false}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-11 text-red-700 dark:text-red-300 sm:size-9"
                    disabled={rows.length === 1}
                    onClick={() => onRowsChange(rows.filter(({ id }) => id !== row.id))}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </ActionHint>
              </div>
            </div>
            {error?.rowId === row.id && (
              <p
                ref={errorRef}
                role="alert"
                tabIndex={-1}
                className="mb-2 text-sm text-red-700 dark:text-red-300"
              >
                {error.message}
              </p>
            )}
            <div className="grid grid-cols-2 gap-1.5 text-sm @min-[25rem]:grid-cols-3">
              <div className="col-span-2 min-w-0 space-y-1 @min-[25rem]:col-span-1">
                <label htmlFor={`session-date-${row.id}`} className="flex items-center gap-1.5">
                  <Calendar
                    size={13}
                    aria-hidden="true"
                    className="shrink-0 text-indigo-700 dark:text-indigo-300"
                  />
                  {t('schedule.date')}
                </label>
                <div className="relative">
                  <Input
                    id={`session-date-${row.id}`}
                    required
                    type="date"
                    size="sm"
                    value={row.sessionDate}
                    onChange={(event) => update(row.id, 'sessionDate', event.target.value)}
                    className="min-w-0 pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex w-10">
                    <ActionHint label={t('schedule.selectDate')} fullWidth showTouchLabel={false}>
                      <button
                        type="button"
                        className="grid h-full place-items-center rounded-r-lg text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300"
                        onClick={() => {
                          const input = document.getElementById(`session-date-${row.id}`);
                          if (!(input instanceof HTMLInputElement)) return;
                          if (input?.showPicker) input.showPicker();
                          else input?.focus();
                        }}
                      >
                        <Calendar size={15} aria-hidden="true" />
                      </button>
                    </ActionHint>
                  </div>
                </div>
              </div>
              {(
                [
                  ['startTime', 'time', 'schedule.startTime'],
                  ['endTime', 'time', 'schedule.endTime'],
                ] as const
              ).map(([field, type, label]) => (
                <label key={field} className="min-w-0 space-y-1">
                  <span className="flex items-center gap-1.5">
                    <Clock
                      size={13}
                      aria-hidden="true"
                      className="shrink-0 text-indigo-700 dark:text-indigo-300"
                    />
                    {t(label)}
                  </span>
                  <Input
                    required
                    size="sm"
                    type={type}
                    value={row[field]}
                    onChange={(event) => update(row.id, field, event.target.value)}
                    className="min-w-0"
                  />
                </label>
              ))}
              <label className="min-w-0 space-y-1 @min-[25rem]:col-start-1">
                <span className="flex items-center gap-1.5">
                  <MapPin
                    size={13}
                    aria-hidden="true"
                    className="shrink-0 text-indigo-700 dark:text-indigo-300"
                  />
                  {t('schedule.room')}
                </span>
                <Select
                  required
                  size="sm"
                  value={row.roomId}
                  onChange={(event) => update(row.id, 'roomId', event.target.value)}
                >
                  <option value="" disabled>
                    ---
                  </option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="min-w-0 space-y-1">
                <span className="flex items-center gap-1.5">
                  <User
                    size={13}
                    aria-hidden="true"
                    className="shrink-0 text-indigo-700 dark:text-indigo-300"
                  />
                  {t('schedule.teacher')}
                </span>
                <Select
                  required
                  size="sm"
                  value={row.teacherId}
                  onChange={(event) => update(row.id, 'teacherId', event.target.value)}
                >
                  <option value="" disabled>
                    ---
                  </option>
                  {availableTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="add-action"
        disabled={rows.length >= maxBatchSessions}
        onClick={() =>
          onRowsChange([
            ...rows,
            { ...rows[rows.length - 1], id: crypto.randomUUID(), sessionDate: '', notes: '' },
          ])
        }
      >
        <Plus
          size={16}
          aria-hidden="true"
          className="mr-1.5 text-indigo-700 add-action-icon dark:text-indigo-300"
        />
        {t('schedule.addSession')}
      </Button>
    </div>
  );
}
