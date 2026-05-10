import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableDaySlotProps {
  id: string; // The date string (e.g., '2025-01-06')
  children: React.ReactNode;
  className?: string;
}

const DroppableDaySlot: React.FC<DroppableDaySlotProps> = ({ id, children, className = '' }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: 'DaySlot',
      date: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-1 sm:p-2 transition-colors min-h-[80px] h-full ${
        isOver ? 'bg-blue-50/50 dark:bg-blue-900/30 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-md' : 'bg-transparent'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default DroppableDaySlot;
