import { useRef, type MouseEvent, type PointerEvent } from 'react';

export type MovePack = (direction: -1 | 1, preserveScroll?: boolean) => void;

export function usePackSwipe(move: MovePack | undefined) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!move || !event.isPrimary || event.button !== 0) return;
      swiped.current = false;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      const target = event.target instanceof Element ? event.target : event.currentTarget;
      target.setPointerCapture(event.pointerId);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const origin = start.current;
      if (!origin || event.pointerId !== origin.id) return;
      start.current = null;
      const x = event.clientX - origin.x;
      const y = event.clientY - origin.y;
      if (Math.abs(x) >= 44 && Math.abs(x) > Math.abs(y) * 1.25) {
        swiped.current = true;
        move?.(x < 0 ? 1 : -1);
      }
    },
    onClickCapture(event: MouseEvent<HTMLDivElement>) {
      if (!swiped.current || event.detail === 0) return;
      swiped.current = false;
      event.stopPropagation();
    },
    onLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
      if (start.current?.id === event.pointerId) start.current = null;
    },
  };
}
