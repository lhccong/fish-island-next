import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

const positionKey = 'fish-island:work-time-position';
const clamp = (value: number) => Math.max(0, Math.min(1, value));
type Position = { x: number; y: number };
function readPosition(): Position {
  try {
    const value = JSON.parse(localStorage.getItem(positionKey) ?? 'null') as Position | null;
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y))
      return { x: clamp(value.x), y: clamp(value.y) };
  } catch {
    // 本机存储不可用时仍可移动。
  }
  return { x: 1, y: 0.7 };
}

export function useWorkTimeOrb(suspended: boolean) {
  const [position, setPosition] = useState(readPosition);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    origin: Position;
    last: Position;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const wakeOnly = useRef(false);
  const side = position.x === 0 ? 'left' : position.x === 1 ? 'right' : 'none';
  useEffect(() => {
    if (side === 'none' || collapsed || hovered || focused || dragging || suspended) return;
    const timer = window.setTimeout(() => setCollapsed(true), 2500);
    return () => window.clearTimeout(timer);
  }, [side, collapsed, hovered, focused, dragging, suspended]);

  function move(next: Position) {
    setPosition(next);
    try {
      localStorage.setItem(positionKey, JSON.stringify(next));
    } catch {
      // 拖动在本次会话仍生效。
    }
  }
  function cancel() {
    if (drag.current) setPosition(drag.current.origin);
    drag.current = null;
    setDragging(false);
  }
  return {
    area,
    position,
    collapsed,
    side,
    dragging,
    onPointerEnter(event: PointerEvent<HTMLButtonElement>) {
      if (event.pointerType !== 'mouse') return;
      setHovered(true);
      setCollapsed(false);
    },
    onPointerLeave() {
      setHovered(false);
    },
    onFocus(event: FocusEvent<HTMLButtonElement>) {
      if (!event.currentTarget.matches(':focus-visible')) return;
      setFocused(true);
      setCollapsed(false);
    },
    onBlur() {
      setFocused(false);
    },
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (!event.isPrimary || event.button !== 0) return;
      wakeOnly.current = collapsed;
      suppressClick.current = false;
      setCollapsed(false);
      setFocused(false);
      setDragging(true);
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        origin: position,
        last: position,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const active = drag.current;
      if (!active || active.id !== event.pointerId || !area.current) return;
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (!active.moved && Math.hypot(dx, dy) < 6) return;
      active.moved = true;
      suppressClick.current = true;
      const bounds = area.current.getBoundingClientRect();
      active.last = {
        x: clamp(active.origin.x + dx / Math.max(1, bounds.width - 80)),
        y: clamp(active.origin.y + dy / Math.max(1, bounds.height - 80)),
      };
      setPosition(active.last);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const active = drag.current;
      if (!active || active.id !== event.pointerId) return;
      if (active.moved && area.current) {
        const width = Math.max(1, area.current.clientWidth - 80);
        const x = active.last.x * width;
        move({ ...active.last, x: x <= 40 ? 0 : width - x <= 40 ? 1 : active.last.x });
      }
      drag.current = null;
      setDragging(false);
    },
    onPointerCancel(event: PointerEvent<HTMLButtonElement>) {
      if (drag.current?.id === event.pointerId) cancel();
    },
    onLostPointerCapture(event: PointerEvent<HTMLButtonElement>) {
      if (drag.current?.id === event.pointerId) cancel();
    },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      setFocused(true);
      if (event.key === 'Escape' && side !== 'none') {
        event.preventDefault();
        setCollapsed(true);
        return;
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setCollapsed(false);
        move({ ...position, x: event.key === 'Home' ? 0 : 1 });
        return;
      }
      const delta = {
        ArrowLeft: [-0.05, 0],
        ArrowRight: [0.05, 0],
        ArrowUp: [0, -0.05],
        ArrowDown: [0, 0.05],
      }[event.key];
      if (!delta) return;
      event.preventDefault();
      setCollapsed(false);
      move({ x: clamp(position.x + delta[0]!), y: clamp(position.y + delta[1]!) });
    },
    activate(detail: number, onOpen: () => void) {
      if (suppressClick.current && detail !== 0) {
        suppressClick.current = false;
        return;
      }
      if (collapsed || (wakeOnly.current && detail !== 0)) {
        wakeOnly.current = false;
        setCollapsed(false);
        return;
      }
      onOpen();
    },
  };
}
