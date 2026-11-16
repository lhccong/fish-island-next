import { useLayoutEffect, useRef, useState } from 'react';
import { broadcastLeadIn, broadcastPlayback } from './playback';

export function useBroadcastPlayback(content: string, onComplete: () => void) {
  const laneRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const complete = useRef(onComplete);
  const [timing, setTiming] = useState<ReturnType<typeof broadcastPlayback> | null>(null);
  useLayoutEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);
  useLayoutEffect(() => {
    const lane = laneRef.current;
    const text = textRef.current;
    if (!lane || !text) return;
    const startedAt = performance.now();
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let previous: ReturnType<typeof broadcastPlayback> | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animation | undefined;
    const configure = () => {
      const distance = Math.max(0, text.scrollWidth - lane.clientWidth);
      if (previous?.distance === distance && previous.reducedMotion === media.matches) return;
      const plan = broadcastPlayback(distance, media.matches, Array.from(content).length);
      previous = plan;
      clearTimeout(timer);
      animation?.cancel();
      const elapsed = performance.now() - startedAt;
      if (plan.scrollDuration) {
        animation = text.animate(
          [
            { transform: 'translateX(0)', offset: 0 },
            { transform: 'translateX(0)', offset: broadcastLeadIn / plan.duration },
            {
              transform: `translateX(-${distance}px)`,
              offset: (broadcastLeadIn + plan.scrollDuration) / plan.duration,
            },
            { transform: `translateX(-${distance}px)`, offset: 1 },
          ],
          { duration: plan.duration, easing: 'linear', fill: 'both' },
        );
        animation.currentTime = Math.min(elapsed, plan.duration);
      }
      timer = setTimeout(() => complete.current(), Math.max(0, plan.duration - elapsed));
      setTiming(plan);
    };
    const observer = new ResizeObserver(configure);
    observer.observe(lane);
    observer.observe(text);
    media.addEventListener('change', configure);
    configure();
    return () => {
      clearTimeout(timer);
      animation?.cancel();
      observer.disconnect();
      media.removeEventListener('change', configure);
    };
  }, [content]);
  return { laneRef, textRef, timing };
}
