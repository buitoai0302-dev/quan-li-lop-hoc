import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Edit2, GripVertical, User, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/common/UI';
import type { Session } from '@/types';

import { getColorByClassId } from '@/utils/sessionColors';
import { SCHEDULE_DRAG_TYPES } from '../utils/scheduleDrag';

interface DraggableSessionCardProps {
  session: Session;
  onEdit?: (session: Session) => void;
  onView?: (session: Session) => void;
  dragDisabled?: boolean;
}

const DraggableSessionCard: React.FC<DraggableSessionCardProps> = ({
  session,
  onEdit,
  onView,
  dragDisabled = false,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: session.id,
    data: {
      type: SCHEDULE_DRAG_TYPES.SESSION,
      session,
    },
    disabled: !onEdit || dragDisabled,
  });

  const color = getColorByClassId(session.class_id);

  return (
    <div
      ref={setNodeRef}
      data-session-id={session.id}
      className={`relative min-w-0 p-1.5 sm:p-2 ${color.bg} bg-opacity-70 dark:bg-opacity-40 backdrop-blur-md border ${color.border} rounded-lg shadow-sm hover:shadow-md transition-shadow group ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {onEdit && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={dragDisabled}
          data-session-drag-handle
          aria-label={t('schedule.dragSession', { name: session.class_name })}
          title={t('schedule.dragToChangeDate')}
          {...listeners}
          {...attributes}
          className="absolute top-1 left-0.5 size-9 sm:size-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-300 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary cursor-grab active:cursor-grabbing touch-none disabled:cursor-wait z-10"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      )}

      {onEdit && (
        <button
          type="button"
          aria-label={t('schedule.editSessionLabel', { name: session.class_name })}
          className={`absolute top-1 right-1 min-h-10 min-w-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer hover:scale-110 z-10`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(session);
          }}
        >
          <Edit2 size={16} className={color.icon} />
        </button>
      )}

      <button
        type="button"
        disabled={!onView}
        aria-label={t('schedule.viewSession', { name: session.class_name })}
        onMouseDown={(event) => listeners?.onMouseDown?.(event)}
        className={`h-full w-full select-none relative text-left ${onEdit ? 'pt-9 sm:cursor-grab active:cursor-grabbing' : 'pt-1'}`}
        onClick={() => onView?.(session)}
      >
        <div
          className={`font-black ${color.text} text-xs sm:text-sm truncate pr-3 leading-tight uppercase tracking-tight`}
        >
          {session.class_name || t('common.class')}
        </div>

        <div className="mt-1.5 flex flex-col gap-1">
          <Badge
            variant="outline"
            size="sm"
            className={`${color.accent} bg-white/60 dark:bg-black/30 border-none font-semibold text-[10px] tracking-normal tabular-nums whitespace-nowrap max-w-full w-fit px-1 py-0.5`}
          >
            {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
          </Badge>

          <Badge
            variant="ghost"
            size="xs"
            className="text-gray-600 dark:text-gray-300 font-bold px-0 gap-1 text-xs w-full"
          >
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{session.room_name}</span>
          </Badge>
        </div>

        {session.teacher_name && user?.id !== session.teacher_id && (
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate font-bold flex items-center gap-1">
            <User size={9} className="shrink-0 text-gray-400" />
            <span className="truncate">{session.teacher_name}</span>
          </div>
        )}

        {/* Subtle indicator for mobile that it's clickable */}
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-blue-300 dark:border-indigo-500 rounded-br-[2px] sm:hidden"></div>

        {session.notes && (
          <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/30 px-1 py-0.5 rounded mt-1 truncate border border-yellow-200/50 dark:border-yellow-700/50">
            {session.notes}
          </div>
        )}
      </button>
    </div>
  );
};

export default DraggableSessionCard;
