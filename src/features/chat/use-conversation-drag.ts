import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';

type Drop = { key: string; edge: 'before' | 'after' };
type Drag = {
  key: string;
  button: HTMLButtonElement;
  pointerId: number;
  viewport: HTMLElement;
  startY: number;
  x: number;
  y: number;
  started: boolean;
};

function findDrop(list: HTMLOListElement, drag: Drag, bounds: DOMRect): Drop | undefined {
  if (
    drag.x < bounds.left ||
    drag.x > bounds.right ||
    drag.y < bounds.top ||
    drag.y > bounds.bottom
  )
    return;
  let lastKey: string | undefined;
  for (const row of list.children) {
    const key = (row as HTMLElement).dataset.conversationKey;
    if (!key || key === drag.key) continue;
    const rect = row.getBoundingClientRect();
    if (drag.y < rect.top + rect.height / 2) return { key, edge: 'before' };
    lastKey = key;
  }
  if (lastKey) return { key: lastKey, edge: 'after' };
}

export function useConversationDrag(onMove: (key: string, drop: Drop) => boolean) {
  const listRef = useRef<HTMLOListElement>(null);
  const active = useRef<Drag | null>(null);
  const frame = useRef(0);
  const skipClick = useRef(false);
  const focusAfterMove = useRef<HTMLButtonElement | null>(null);
  const [preview, setPreview] = useState<{ source: string; drop?: Drop | undefined } | null>(null);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      active.current = null;
    },
    [],
  );
  useLayoutEffect(() => {
    focusAfterMove.current?.focus();
    focusAfterMove.current = null;
  });

  function updatePreview() {
    frame.current = 0;
    const drag = active.current;
    if (!drag?.started || !listRef.current) return;
    if (!drag.button.isConnected) {
      active.current = null;
      setPreview(null);
      return;
    }
    const bounds = drag.viewport.getBoundingClientRect();
    const drop = findDrop(listRef.current, drag, bounds);
    setPreview((previous) =>
      previous?.source === drag.key &&
      previous.drop?.key === drop?.key &&
      previous.drop?.edge === drop?.edge
        ? previous
        : { source: drag.key, drop },
    );
    if (!drop) return;
    const edge = Math.min(40, bounds.height / 4);
    const amount =
      drag.y < bounds.top + edge
        ? -Math.ceil((bounds.top + edge - drag.y) / 3)
        : Math.max(0, Math.ceil((drag.y - (bounds.bottom - edge)) / 3));
    const before = drag.viewport.scrollTop;
    drag.viewport.scrollTop += amount;
    if (drag.viewport.scrollTop !== before) frame.current = requestAnimationFrame(updatePreview);
  }

  function moveAndFocus(key: string, drop: Drop, button: HTMLButtonElement) {
    if (onMove(key, drop)) focusAfterMove.current = button;
  }

  function finish(event: PointerEvent<HTMLButtonElement>, commit = false) {
    const drag = active.current;
    if (drag?.pointerId !== event.pointerId) return;
    active.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (drag.button.hasPointerCapture(drag.pointerId))
      drag.button.releasePointerCapture(drag.pointerId);
    if (!drag.started) return;
    setPreview(null);
    skipClick.current = true;
    if (!commit || !listRef.current) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const list = listRef.current;
    const drop = findDrop(list, drag, drag.viewport.getBoundingClientRect());
    if (drop)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (listRef.current === list) onMove(drag.key, drop);
      });
  }

  return {
    listRef,
    preview,
    moveAndFocus,
    pointerHandlers: (key: string, onClick: () => void) => ({
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (!event.isPrimary || event.button !== 0 || active.current?.button.isConnected) return;
        const button = event.currentTarget;
        const viewport = button.closest<HTMLElement>('[data-radix-scroll-area-viewport]');
        if (!viewport) return;
        skipClick.current = false;
        setPreview(null);
        active.current = {
          key,
          button,
          viewport,
          pointerId: event.pointerId,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          started: false,
        };
        button.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const drag = active.current;
        if (drag?.pointerId !== event.pointerId) return;
        drag.x = event.clientX;
        drag.y = event.clientY;
        if (!drag.started && Math.abs(drag.y - drag.startY) < 5) return;
        drag.started = true;
        if (!frame.current) frame.current = requestAnimationFrame(updatePreview);
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event, true),
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finish(event),
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finish(event),
      onClick(event: { detail: number }) {
        if (event.detail === 0 || !skipClick.current) onClick();
        skipClick.current = false;
      },
    }),
  };
}
