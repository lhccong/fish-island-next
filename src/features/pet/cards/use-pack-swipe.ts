import { useRef, type PointerEvent } from 'react';

export type MovePack = (direction: -1 | 1) => void;

export function usePackSwipe(move: MovePack | undefined) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!move || !event.isPrimary || event.button !== 0) return;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const origin = start.current;
      if (!origin || event.pointerId !== origin.id) return;
      start.current = null;
      const x = event.clientX - origin.x;
      const y = event.clientY - origin.y;
      if (Math.abs(x) >= 44 && Math.abs(x) > Math.abs(y) * 1.25) move?.(x < 0 ? 1 : -1);
    },
    onLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
      if (start.current?.id === event.pointerId) start.current = null;
    },
  };
}
