import { useEffect, type RefObject } from 'react';
import type { MessageNavigation } from './message-navigation';

export function useMessageLocationPulse(
  ref: RefObject<HTMLDivElement | null>,
  navigation: MessageNavigation,
  id: string,
  revision: number,
) {
  useEffect(() => {
    if (!revision) return;
    let animation: Animation | undefined;
    // Defer until the virtual row is mounted; StrictMode cleanup cancels the first frame.
    const frame = requestAnimationFrame(() => {
      const bubble = ref.current;
      if (!bubble || !navigation.claimPulse(id, revision)) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ring = '0 0 0 2px var(--color-accent-text)';
      const clear = '0 0 0 2px transparent';
      animation = bubble.animate(
        reduced
          ? [{ boxShadow: ring }, { boxShadow: ring }]
          : [{ boxShadow: clear }, { boxShadow: ring, offset: 0.5 }, { boxShadow: clear }],
        { duration: reduced ? 700 : 550, iterations: reduced ? 1 : 3, easing: 'ease-in-out' },
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
    };
  }, [ref, navigation, id, revision]);
}
