import { useEffect, useRef, useState } from 'react';
export function useOperation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  async function run<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    if (active.current) return undefined;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError('');
    try {
      const result = await task(controller.signal);
      return controller.signal.aborted ? undefined : result;
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '操作失败，请重试');
      return undefined;
    } finally {
      if (!controller.signal.aborted) setPending(false);
      if (active.current === controller) active.current = null;
    }
  }
  return { run, pending, error };
}
