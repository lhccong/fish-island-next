import { useCallback, useEffect, useState } from 'react';
import type { Page } from '@/domain/fish-circle';
type Result<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Page<T> };
export function usePage<T>(load: (page: number, signal: AbortSignal) => Promise<Page<T>>) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<T>>({ status: 'loading' });
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function fetchPage() {
      setResult({ status: 'loading' });
      try {
        const data = await load(page, controller.signal);
        if (!controller.signal.aborted) setResult({ status: 'ready', data });
      } catch (e) {
        if (!controller.signal.aborted)
          setResult({ status: 'error', message: e instanceof Error ? e.message : '加载失败' });
      }
    }
    void fetchPage();
    return () => controller.abort();
  }, [load, page, revision]);
  return { page, setPage, result, refresh };
}
