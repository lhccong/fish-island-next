import { useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from 'react';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function useMusicOrb() {
  const area = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 1, y: 0.32 });
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    origin: typeof position;
    moved: boolean;
  } | null>(null);
  const suppress = useRef(false);
  return {
    area,
    style: { '--music-x': position.x, '--music-y': position.y } as CSSProperties,
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        origin: position,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const current = drag.current;
      const bounds = area.current?.getBoundingClientRect();
      if (!current || current.id !== event.pointerId || !bounds) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (Math.hypot(dx, dy) < 6 && !current.moved) return;
      current.moved = true;
      setPosition({
        x: clamp(current.origin.x + dx / Math.max(1, bounds.width - 64)),
        y: clamp(current.origin.y + dy / Math.max(1, bounds.height - 64)),
      });
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (drag.current?.id !== event.pointerId) return;
      suppress.current = drag.current.moved;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel() {
      if (drag.current) setPosition(drag.current.origin);
      drag.current = null;
      suppress.current = false;
    },
    onClickCapture(event: { preventDefault: () => void; stopPropagation: () => void }) {
      if (suppress.current) {
        event.preventDefault();
        event.stopPropagation();
        suppress.current = false;
      }
    },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-0.05, 0],
        ArrowRight: [0.05, 0],
        ArrowUp: [0, -0.05],
        ArrowDown: [0, 0.05],
      };
      const delta = steps[event.key];
      if (delta) {
        event.preventDefault();
        setPosition((value) => ({ x: clamp(value.x + delta[0]), y: clamp(value.y + delta[1]) }));
      }
      if (event.key === 'Home') {
        event.preventDefault();
        setPosition({ x: 1, y: 0.32 });
      }
    },
  };
}
