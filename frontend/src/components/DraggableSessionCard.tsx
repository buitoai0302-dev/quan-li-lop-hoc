import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Edit2 } from 'lucide-react';
import type { Session } from '../types';

interface DraggableSessionCardProps {
  session: Session;
  onEdit?: (session: Session) => void;
}

const DraggableSessionCard: React.FC<DraggableSessionCardProps> = ({ session, onEdit }) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative p-3 bg-blue-50 dark:bg-indigo-900/80 border border-blue-200 dark:border-indigo-500/70 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab group ${
        isDragging ? 'drag-overlay opacity-50' : ''
      }`}
    >
      {onEdit && (
        <div 
          className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-indigo-700 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-blue-100 dark:hover:bg-indigo-600 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(session);
          }}
          title="Edit session"
        >
          <Edit2 size={14} className="text-blue-600 dark:text-blue-300" />
        </div>
      )}

      <div 
        {...listeners}
        {...attributes}
        className="h-full w-full"
      >
        <div className="font-bold text-blue-900 dark:text-white text-sm truncate pr-6">{session.class_name || 'Class'}</div>
        <div className="text-xs text-blue-700 dark:text-indigo-200 mt-1 flex items-center gap-1">
          <span className="font-medium bg-blue-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-[10px] sm:text-xs text-blue-800 dark:text-indigo-100 inline-block">
            {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
          </span>
        </div>
        <div className="text-xs text-gray-700 dark:text-gray-200 mt-1 truncate">{session.teacher_name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{session.room_name}</div>
        {session.notes && (
          <div className="text-[10px] text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded mt-1.5 truncate border border-yellow-200 dark:border-yellow-700/50" title={session.notes}>
            {session.notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableSessionCard;
