import { useEffect, useRef, useState } from 'react';
export function useAdminMutation() {
  const active = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => active.current?.abort(), []);
  async function run(action: (signal: AbortSignal) => Promise<void>, onSuccess: () => void) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError('');
    try {
      await action(controller.signal);
      if (!controller.signal.aborted) onSuccess();
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '操作失败，请重试');
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setPending(false);
      }
    }
  }
  return { pending, error, run };
}
