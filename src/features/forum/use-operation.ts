import { useEffect, useRef, useState } from 'react';
export function useOperation() {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  async function run(task: (signal: AbortSignal) => Promise<void>, success = '') {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setMessage('');
    try {
      await task(controller.signal);
      if (!controller.signal.aborted) setMessage(success);
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : '操作失败，请重试');
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return { busy, message, run };
}
