import { pointerWithin } from '@dnd-kit/core';
import type { CollisionDetection, KeyboardCoordinateGetter, Modifier } from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';

export const SCHEDULE_DRAG_TYPES = {
  SESSION: 'Session',
  DAY: 'DaySlot',
} as const;

export const SCHEDULE_DRAG_ACTIVATION = {
  MOUSE_DISTANCE_PX: 6,
  TOUCH_DELAY_MS: 180,
  TOUCH_TOLERANCE_PX: 8,
} as const;

interface KeyboardDateTarget {
  current: string | null;
}

export const createScheduleDropCollision =
  (keyboardDate: KeyboardDateTarget): CollisionDetection =>
  (args) => {
    // Require a visible day under the pointer. Rectangles can extend behind
    // sticky headers or outside the scroll viewport; those are not drop targets.
    if (args.pointerCoordinates) {
      const hit = document.elementFromPoint(args.pointerCoordinates.x, args.pointerCoordinates.y);
      return pointerWithin(args).filter(({ id }) => {
        const target = args.droppableContainers.find((container) => container.id === id);
        return Boolean(hit && target?.node.current?.contains(hit));
      });
    }
    // Keyboard selection follows dates, not the different sizes of a table row
    // and its preview. Starting and dropping without an arrow must keep the date.
    const target = args.droppableContainers.find(
      (container) => container.data.current?.date === keyboardDate.current
    );
    return target ? [{ id: target.id }] : [];
  };

const DRAG_PREVIEW_GAP_PX = 16;

// Keep the preview below the pointer so it cannot cover the chosen date.
export const offsetSchedulePreview: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  windowRect,
  over,
  transform,
}) => {
  const coordinates = activatorEvent && getEventCoordinates(activatorEvent);
  if (!coordinates || !activeNodeRect) return transform;
  const left = coordinates.x + transform.x + DRAG_PREVIEW_GAP_PX;
  const top = Math.max(
    coordinates.y + transform.y + DRAG_PREVIEW_GAP_PX,
    over?.data.current?.previewBelow ? over.rect.bottom + DRAG_PREVIEW_GAP_PX / 2 : 0
  );
  const maxLeft =
    windowRect && overlayNodeRect
      ? windowRect.width - overlayNodeRect.width - DRAG_PREVIEW_GAP_PX
      : left;

  return {
    ...transform,
    x: Math.max(DRAG_PREVIEW_GAP_PX, Math.min(left, maxLeft)) - activeNodeRect.left,
    y: top - activeNodeRect.top,
  };
};

const KEYBOARD_DAY_OFFSETS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export const createScheduleKeyboardCoordinates =
  (keyboardDate: KeyboardDateTarget): KeyboardCoordinateGetter =>
  (event, { context }) => {
    const offset = KEYBOARD_DAY_OFFSETS[event.code];
    if (!offset || !context.collisionRect) return;
    event.preventDefault();

    const days = context.droppableContainers
      .getEnabled()
      .filter((container) => container.data.current?.type === SCHEDULE_DRAG_TYPES.DAY)
      .sort((first, second) =>
        String(first.data.current?.date).localeCompare(String(second.data.current?.date))
      );
    const currentDate = keyboardDate.current;
    const currentIndex = days.findIndex((day) => day.data.current?.date === currentDate);
    if (currentIndex < 0) return;
    const target = days[currentIndex + offset];
    const rect = target && context.droppableRects.get(target.id);
    if (!rect) return;
    const targetDate = target.data.current?.date;
    if (typeof targetDate !== 'string') return;
    keyboardDate.current = targetDate;

    return {
      x: rect.left + (rect.width - context.collisionRect.width) / 2,
      y: rect.top + (rect.height - context.collisionRect.height) / 2,
    };
  };
