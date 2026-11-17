import { useLayoutEffect, type RefObject } from 'react';

export function useMessageViewport(
  viewport: HTMLElement | null,
  onResize: () => void,
  frame: RefObject<number | undefined>,
) {
  useLayoutEffect(() => {
    const observer = viewport ? new ResizeObserver(onResize) : null;
    if (viewport) observer?.observe(viewport);
    return () => {
      observer?.disconnect();
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
    };
  }, [viewport, onResize, frame]);
}
