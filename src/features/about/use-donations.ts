import { useCallback } from 'react';
import type { AboutPort } from '@/domain/about';
import { useInfinitePages } from '@/shared/ui/InfiniteScroll';

export function useDonations(service: AboutPort, details: boolean, revision: number) {
  const load = useCallback(
    async (page: number, signal: AbortSignal) => {
      // A business refresh starts a new request scope; appearance is independent.
      void revision;
      const data = await service.donations(page, details, signal);
      return { items: data.records, total: data.total };
    },
    [service, details, revision],
  );
  const pages = useInfinitePages(load);
  const data =
    pages.result.status === 'ready'
      ? { records: pages.result.data.items, total: pages.result.data.total }
      : { records: [], total: 0 };
  return {
    status:
      pages.result.status === 'ready'
        ? pages.loadingMore
          ? 'loading'
          : pages.error
            ? 'error'
            : 'ready'
        : pages.result.status,
    data,
    error: pages.result.status === 'error' ? pages.result.message : pages.error,
    hasMore: pages.hasMore,
    loadMore: pages.loadMore,
    reload: pages.result.status === 'ready' ? pages.loadMore : pages.refresh,
  };
}
