import { useEffect, useState } from 'react';
import type { FarmPort } from '@/domain/farm';

const REFRESH_MS = 30_000;

export function useHarvestStatus(
  active: boolean,
  read: FarmPort['harvestStatus'],
  subscribe: (refresh: () => void) => () => void,
) {
  const [harvestable, setHarvestable] = useState(false);

  useEffect(() => {
    if (!active) return;
    let request: AbortController | undefined;
    let disposed = false;

    async function refresh() {
      if (disposed || document.hidden || request) return;
      const controller = new AbortController();
      request = controller;
      try {
        const result = await read(controller.signal);
        if (!controller.signal.aborted) setHarvestable(result);
      } catch {
        if (!controller.signal.aborted) setHarvestable(false);
      } finally {
        if (request === controller) request = undefined;
      }
    }

    function abort() {
      request?.abort();
      request = undefined;
    }

    const invalidate = () => {
      abort();
      void refresh();
    };
    const onVisibility = () => {
      if (document.hidden) abort();
      else void refresh();
    };
    queueMicrotask(() => void refresh());
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const unsubscribe = subscribe(invalidate);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      abort();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [active, read, subscribe]);

  return harvestable;
}
