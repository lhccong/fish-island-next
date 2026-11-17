import { useCallback, useEffect, useRef, useState } from 'react';
import type { TreasurePort, TreasureSiteId, TreasureState } from '@/domain/pet';

type Settled = ((signal: AbortSignal) => Promise<unknown>) | undefined;
export function useCampTreasure(service: TreasurePort, enabled: boolean, onSettled: Settled) {
  const [data, setData] = useState<TreasureState | null>(null);
  const [pending, setPending] = useState<'load' | 'start' | 'finish' | null>(null);
  const [error, setError] = useState('');
  const [balanceError, setBalanceError] = useState(false);
  const [now, setNow] = useState(0);
  const request = useRef<AbortController | null>(null);
  const balanceRequest = useRef<AbortController | null>(null);
  const sample = useRef({ server: 0, local: 0 });

  const syncBalance = useCallback(async () => {
    balanceRequest.current?.abort();
    const controller = new AbortController();
    balanceRequest.current = controller;
    setBalanceError(false);
    try {
      await onSettled?.(controller.signal);
    } catch {
      if (!controller.signal.aborted) setBalanceError(true);
    }
  }, [onSettled]);

  const run = useCallback(
    async (kind: 'load' | 'start' | 'finish', value?: string) => {
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      setPending(kind);
      setError('');
      try {
        const next =
          kind === 'start'
            ? await service.startTreasure(value as TreasureSiteId, controller.signal)
            : kind === 'finish'
              ? await service.finishTreasure(value!, controller.signal)
              : await service.treasureStatus(controller.signal);
        if (controller.signal.aborted) return;
        sample.current = { server: next.serverNow, local: performance.now() };
        setData(next);
        setNow(next.serverNow);
        if (kind === 'finish' && !next.active) void syncBalance();
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '挖宝失败，请重试');
      } finally {
        if (!controller.signal.aborted) {
          request.current = null;
          setPending(null);
        }
      }
    },
    [service, syncBalance],
  );

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void Promise.resolve().then(() => {
      if (live) void run('load');
    });
    return () => {
      live = false;
      request.current?.abort();
      request.current = null;
      balanceRequest.current?.abort();
    };
  }, [enabled, run]);

  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(
      () => {
        const time = sample.current.server + performance.now() - sample.current.local;
        setNow(time);
        if (pending || error) return;
        if (data.active && time >= data.active.readyAt) void run('finish', data.active.id);
        else if (
          !data.active &&
          (time >= data.resetAt ||
            (data.nextAvailableAt > data.serverNow && time >= data.nextAvailableAt))
        )
          void run('load');
      },
      data.active ? 100 : 1000,
    );
    return () => clearInterval(timer);
  }, [data, pending, error, run]);

  // Reconcile another tab's progress when returning, without background polling.
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (!document.hidden) void run('load');
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, run]);

  const available = !!data && !data.active && data.used < 5 && now >= data.nextAvailableAt;
  return {
    data,
    pending,
    error,
    balanceError,
    syncBalance,
    now,
    available: available && !pending && !error,
    start: (site: TreasureSiteId) => {
      if (available && !error) void run('start', site);
    },
    retry: () => void run('load'),
  };
}
