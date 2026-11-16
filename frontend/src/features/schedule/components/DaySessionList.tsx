import { useMemo } from 'react';
import { Edit2, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/UI';
import type { Session } from '@/types';
import { getColorByClassId } from '@/utils/sessionColors';
import { SCHEDULE_DRAG_TYPES } from '../utils/scheduleDrag';

interface DaySessionListProps {
  sessions: Session[];
  onView: (session: Session) => void;
  onEdit?: (session: Session) => void;
  dragDisabled?: boolean;
}

export default function DaySessionList({
  sessions,
  onView,
  onEdit,
  dragDisabled,
}: DaySessionListProps) {
  const { t } = useTranslation();
  const orderedSessions = useMemo(
    () =>
      [...sessions].sort(
        (first, second) =>
          first.start_time.localeCompare(second.start_time) ||
          first.end_time.localeCompare(second.end_time) ||
          (first.class_name || '').localeCompare(second.class_name || '')
      ),
    [sessions]
  );

  return (
    <table className="w-full table-fixed text-left text-sm">
      <caption className="sr-only">{t('schedule.dailySessions')}</caption>
      <colgroup>
        <col className={onEdit ? 'w-44' : 'w-36'} />
        <col />
        <col className="w-40 xl:w-48" />
        <col className="w-32 xl:w-40" />
        {onEdit && <col className="w-20" />}
      </colgroup>
      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <tr>
          <th scope="col" className="px-4 py-3 font-medium">
            {t('schedule.time')}
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            {t('schedule.class')}
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            {t('schedule.teacher')}
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            {t('schedule.room')}
          </th>
          {onEdit && (
            <th scope="col" className="px-3 py-3 text-right font-medium whitespace-nowrap">
              {t('common.actions')}
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
        {orderedSessions.map((session) => (
          <DaySessionRow
            key={session.id}
            session={session}
            onView={onView}
            onEdit={onEdit}
            dragDisabled={dragDisabled}
          />
        ))}
        {orderedSessions.length === 0 && (
          <tr>
            <td
              colSpan={onEdit ? 5 : 4}
              className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
            >
              {t('schedule.noSessionsForDay')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function DaySessionRow({
  session,
  onView,
  onEdit,
  dragDisabled,
}: Omit<DaySessionListProps, 'sessions'> & { session: Session }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: session.id,
    data: { type: SCHEDULE_DRAG_TYPES.SESSION, session },
    disabled: !onEdit || dragDisabled,
  });
  const color = getColorByClassId(session.class_id);
  const className = session.class_name || t('common.class');
  return (
    <tr
      ref={setNodeRef}
      data-session-id={session.id}
      className={`transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50/80 motion-reduce:transition-none dark:hover:bg-slate-700/25 dark:focus-within:bg-slate-700/25 ${isDragging ? 'opacity-40' : ''}`}
    >
      <td className="px-4 py-3 align-middle font-semibold tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              ref={setActivatorNodeRef}
              type="button"
              disabled={dragDisabled}
              data-session-drag-handle
              {...attributes}
              {...listeners}
              aria-label={t('schedule.dragSession', { name: className })}
              title={t('schedule.dragToChangeDate')}
              className="-ml-2 flex size-8 shrink-0 touch-none items-center justify-center rounded-md text-slate-400 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary cursor-grab active:cursor-grabbing disabled:cursor-wait"
            >
              <GripVertical size={16} aria-hidden="true" />
            </button>
          )}
          <span>
            {session.start_time.substring(0, 5)} – {session.end_time.substring(0, 5)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <button
          type="button"
          onClick={() => onView(session)}
          onMouseDown={(event) => listeners?.onMouseDown?.(event)}
          aria-label={t('schedule.viewSession', { name: className })}
          title={className}
          className="flex min-h-10 w-full min-w-0 items-center gap-2.5 rounded-md text-left font-semibold text-slate-900 outline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-100 dark:hover:text-indigo-300"
        >
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full bg-current ${color.icon}`}
          />
          <span className="line-clamp-2 [overflow-wrap:anywhere]">{className}</span>
        </button>
        {session.notes && (
          <p
            className="mt-0.5 truncate pl-[1.125rem] text-xs text-slate-500 dark:text-slate-400"
            title={session.notes}
          >
            {session.notes}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300">
        <span className="line-clamp-2 [overflow-wrap:anywhere]" title={session.teacher_name}>
          {session.teacher_name || '—'}
        </span>
      </td>
      <td className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300">
        <span className="line-clamp-2 [overflow-wrap:anywhere]" title={session.room_name}>
          {session.room_name || '—'}
        </span>
      </td>
      {onEdit && (
        <td className="px-3 py-3 text-right align-middle">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(session)}
            aria-label={t('schedule.editSessionLabel', { name: className })}
            title={t('schedule.editSession')}
          >
            <Edit2 size={16} aria-hidden="true" />
          </Button>
        </td>
      )}
    </tr>
  );
}
