import { useEffect, useState, type PointerEvent } from 'react';
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
const defaults: Bounds = { x: 80, y: 100, width: 620, height: 640 };
function clamp(bounds: Bounds): Bounds {
  const width = Math.min(Math.max(320, bounds.width), innerWidth);
  const height = Math.min(Math.max(280, bounds.height), innerHeight);
  return {
    width,
    height,
    x: Math.max(0, Math.min(innerWidth - width, bounds.x)),
    y: Math.max(0, Math.min(innerHeight - height, bounds.y)),
  };
}
export function useReaderWindow() {
  const [bounds, setBounds] = useState<Bounds>(() => {
    try {
      const legacy = {
        ...JSON.parse(localStorage.getItem('fish-reader-position') || '{}'),
        ...JSON.parse(localStorage.getItem('fish-reader-size') || '{}'),
      } as unknown;
      const raw: unknown =
        JSON.parse(localStorage.getItem('fish-island:reader-bounds') || 'null') ?? legacy;
      if (
        raw &&
        typeof raw === 'object' &&
        ['x', 'y', 'width', 'height'].every((key) =>
          Number.isFinite((raw as Record<string, unknown>)[key]),
        )
      )
        return clamp(raw as Bounds);
    } catch {
      /* Invalid geometry uses safe defaults. */
    }
    return clamp(defaults);
  });
  useEffect(() => {
    const resize = () => setBounds((value) => clamp(value));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const start = (event: PointerEvent<HTMLElement>, resizing: boolean) => {
    if (event.button !== 0 || innerWidth <= 760) return;
    const target = event.currentTarget;
    const original = bounds;
    const x = event.clientX;
    const y = event.clientY;
    target.setPointerCapture(event.pointerId);
    const move = (current: globalThis.PointerEvent) =>
      setBounds(
        clamp(
          resizing
            ? {
                ...original,
                width: original.width + current.clientX - x,
                height: original.height + current.clientY - y,
              }
            : {
                ...original,
                x: original.x + current.clientX - x,
                y: original.y + current.clientY - y,
              },
        ),
      );
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  };
  const save = () => {
    try {
      localStorage.setItem('fish-island:reader-bounds', JSON.stringify(bounds));
    } catch {
      /* Geometry is optional. */
    }
  };
  return { bounds, start, save, reset: () => setBounds(clamp(defaults)) };
}
