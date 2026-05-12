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
      className={`flex-1 p-1 sm:p-2 transition-all min-h-[100px] h-full ${
        isOver
          ? 'bg-blue-100/30 dark:bg-blue-900/40 backdrop-blur-md border-2 border-dashed border-primary/50 rounded-xl ring-4 ring-primary/5 scale-[0.99]'
          : 'bg-transparent'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default DroppableDaySlot;
