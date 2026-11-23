import { useEffect, useRef } from 'react';
import {
  petCardsDay,
  type PetCardPlayAction,
  type PetCardPlayPort,
  type PetCardPlayState,
} from '@/domain/pet';

export function usePetCardActions(
  port: PetCardPlayPort,
  state: PetCardPlayState,
  accept: (state: PetCardPlayState) => void,
  onPurchased: ((signal: AbortSignal) => Promise<unknown>) | undefined,
) {
  const request = useRef<AbortSignal | null>(null);
  const refresh = useRef<AbortController | null>(null);
  const retry = useRef<{ key: string; id: string } | null>(null);

  useEffect(() => {
    async function refreshState() {
      if (request.current || refresh.current) return;
      const controller = new AbortController();
      refresh.current = controller;
      try {
        const latest = await port.state(controller.signal);
        if (!controller.signal.aborted) accept(latest);
      } catch {
        // The current snapshot stays usable when a background refresh fails.
      } finally {
        if (refresh.current === controller) refresh.current = null;
      }
    }
    let checkedDay = state.day;
    const interval = window.setInterval(() => {
      const day = petCardsDay();
      if (day !== checkedDay && !request.current && !refresh.current) {
        checkedDay = day;
        void refreshState();
      }
    }, 15_000);
    window.addEventListener('focus', refreshState);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshState);
      refresh.current?.abort();
      refresh.current = null;
    };
  }, [accept, port, state.day]);

  return async function submit(action: PetCardPlayAction, signal: AbortSignal) {
    if (request.current) throw new Error('请等待当前操作完成');
    refresh.current?.abort();
    request.current = signal;
    const key = JSON.stringify(action);
    if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
    try {
      const result = await port.submit(action, retry.current.id, signal);
      retry.current = null;
      if (signal.aborted) return;
      accept(result);
      if (action.type === 'buy' && onPurchased) void onPurchased(signal).catch(() => {});
    } finally {
      request.current = null;
    }
  };
}
