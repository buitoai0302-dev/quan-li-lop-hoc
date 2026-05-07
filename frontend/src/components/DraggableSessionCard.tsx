import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, GripVertical, User, MapPin } from 'lucide-react';
import type { Session } from '../types';

interface DraggableSessionCardProps {
  session: Session;
  onEdit?: (session: Session) => void;
  onView?: (session: Session) => void;
}

const DraggableSessionCard: React.FC<DraggableSessionCardProps> = ({ session, onEdit, onView }) => {
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
      {/* Drag Handle - Only for desktop or dedicated drag area */}
      <div 
        {...listeners} 
        {...attributes}
        className="absolute top-1 left-1 p-1 text-gray-400 hover:text-primary cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical size={12} />
      </div>

      {onEdit && (
        <div 
          className="absolute top-1 right-1 p-1 bg-white/90 dark:bg-indigo-700 rounded shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-blue-100 dark:hover:bg-indigo-600 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(session);
          }}
        >
          <Edit2 size={12} className="text-blue-600 dark:text-blue-300" />
        </div>
      )}

      <div 
        className="h-full w-full select-none relative pt-4"
        onClick={() => onView?.(session)}
      >
        <div className="font-bold text-blue-900 dark:text-white text-[10px] sm:text-sm truncate pr-3">{session.class_name || 'Class'}</div>
        <div className="text-[9px] sm:text-xs text-blue-700 dark:text-indigo-200 mt-0.5 sm:mt-1 flex items-center gap-1">
          <span className="font-black bg-blue-100/50 dark:bg-indigo-800 px-1 py-0.5 rounded text-[8px] sm:text-xs text-blue-800 dark:text-indigo-100 inline-block border border-blue-200/50 dark:border-indigo-600/50">
            {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
          </span>
        </div>
        <div className="text-[9px] sm:text-xs text-gray-700 dark:text-gray-200 mt-1 sm:mt-1.5 truncate font-medium flex items-center gap-1">
          <User size={10} className="shrink-0 text-gray-400 dark:text-gray-500" />
          <span className="truncate">{session.teacher_name}</span>
        </div>
        <div className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
          <MapPin size={10} className="shrink-0 text-gray-400" />
          <span className="truncate">{session.room_name}</span>
        </div>
        
        {/* Subtle indicator for mobile that it's clickable */}
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-blue-300 dark:border-indigo-500 rounded-br-[2px] sm:hidden"></div>
        
        {session.notes && (
          <div className="text-[8px] sm:text-[10px] text-yellow-700 dark:text-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/30 px-1 py-0.5 rounded mt-1 truncate border border-yellow-200/50 dark:border-yellow-700/50">
            {session.notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableSessionCard;
