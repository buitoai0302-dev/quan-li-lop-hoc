import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SCHEDULE_DRAG_TYPES } from '../utils/scheduleDrag';

interface DroppableDaySlotProps {
  id: string;
  date: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  previewBelow?: boolean;
}

const DroppableDaySlot: React.FC<DroppableDaySlotProps> = ({
  id,
  date,
  children,
  className = '',
  disabled = false,
  previewBelow = false,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled,
    data: {
      type: SCHEDULE_DRAG_TYPES.DAY,
      date,
      previewBelow,
    },
  });

  return (
    <div
      ref={setNodeRef}
      data-schedule-date={date}
      data-drop-active={isOver || undefined}
      className={`relative min-w-0 transition-colors motion-reduce:transition-none ${
        isOver
          ? 'ring-2 ring-inset ring-primary after:pointer-events-none after:absolute after:inset-0 after:z-20 after:bg-primary/10'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default DroppableDaySlot;
