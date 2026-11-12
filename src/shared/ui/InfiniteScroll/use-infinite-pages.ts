import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScrollPage<T> {
  items: T[];
  total: number;
}
type Result<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ScrollPage<T> };

export function useInfinitePages<T extends { id: string }>(
  load: (page: number, signal: AbortSignal) => Promise<ScrollPage<T>>,
) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<T>>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const fetchNext = useRef<() => void>(() => {});
  const refresh = useCallback(() => {
    fetchNext.current = () => {};
    setRevision((n) => n + 1);
  }, []);
  const loadMore = useCallback(() => fetchNext.current(), []);
  useEffect(() => {
    const controller = new AbortController();
    let page = 0;
    let pending = false;
    let more = true;
    const items = new Map<string, T>();
    async function fetchPage() {
      if (pending || !more || controller.signal.aborted) return;
      pending = true;
      if (!page) {
        setResult({ status: 'loading' });
        setError('');
        setHasMore(false);
        setLoadingMore(false);
      }
      setError('');
      if (page) setLoadingMore(true);
      try {
        const data = await load(page + 1, controller.signal);
        if (controller.signal.aborted) return;
        const previousSize = items.size;
        for (const item of data.items) items.set(item.id, item);
        page += 1;
        more = items.size > previousSize && items.size < data.total;
        setHasMore(more);
        setResult({ status: 'ready', data: { items: [...items.values()], total: data.total } });
      } catch (e) {
        if (controller.signal.aborted) return;
        const message = e instanceof Error ? e.message : '加载失败';
        if (page) setError(message);
        else setResult({ status: 'error', message });
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoadingMore(false);
      }
    }
    fetchNext.current = () => {
      void fetchPage();
    };
    void fetchPage();
    return () => {
      controller.abort();
      fetchNext.current = () => {};
    };
  }, [load, revision]);
  return { result, refresh, loadMore, loadingMore, error, hasMore };
}
