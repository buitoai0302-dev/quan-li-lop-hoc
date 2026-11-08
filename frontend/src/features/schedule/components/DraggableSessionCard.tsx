import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, GripVertical, User, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/common/UI';
import type { Session } from '@/types';

import { getColorByClassId } from '@/utils/sessionColors';

interface DraggableSessionCardProps {
  session: Session;
  onEdit?: (session: Session) => void;
  onView?: (session: Session) => void;
}

const DraggableSessionCard: React.FC<DraggableSessionCardProps> = ({ session, onEdit, onView }) => {
  const { user } = useAuth();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: {
      type: 'Session',
      session,
    },
    disabled: !onEdit,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const color = getColorByClassId(session.class_id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative p-1.5 sm:p-2 ${color.bg} bg-opacity-70 dark:bg-opacity-40 backdrop-blur-md border ${color.border} rounded-lg shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-grab group ${
        isDragging ? 'drag-overlay opacity-50' : ''
      }`}
    >
      {/* Drag Handle - Only for desktop or dedicated drag area */}
      <button
        type="button"
        aria-label={`Kéo buổi học ${session.class_name || ''}`}
        {...listeners}
        {...attributes}
        className="absolute top-1 left-0.5 p-1 text-gray-400 hover:text-primary cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical size={10} />
      </button>

      {onEdit && (
        <button
          type="button"
          aria-label={`Sửa buổi học ${session.class_name || ''}`}
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
        aria-label={`Xem buổi học ${session.class_name || ''}`}
        className="h-full w-full select-none relative pt-4 text-left"
        onClick={() => onView?.(session)}
      >
        <div
          className={`font-black ${color.text} text-xs sm:text-sm truncate pr-3 leading-tight uppercase tracking-tight`}
        >
          {session.class_name || 'Class'}
        </div>

        <div className="mt-1.5 flex flex-col gap-1">
          <Badge
            variant="outline"
            size="sm"
            className={`${color.accent} bg-white/60 dark:bg-black/30 border-none font-black text-[10px] w-fit px-1.5 py-0.5`}
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
