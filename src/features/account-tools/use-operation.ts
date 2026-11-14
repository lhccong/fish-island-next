import { useEffect, useRef, useState } from 'react';
export function useOperation() {
  const task = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => () => task.current?.abort(), []);
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (task.current && !task.current.signal.aborted) return;
    const current = new AbortController();
    task.current = current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action(current.signal);
    } catch (reason) {
      if (!current.signal.aborted)
        setError(reason instanceof Error ? reason.message : '操作失败，请重试');
    } finally {
      if (task.current === current) {
        task.current = null;
        if (!current.signal.aborted) setBusy(false);
      }
    }
  }
  return { busy, error, notice, setNotice, run };
}
