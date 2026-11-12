import { useCallback } from 'react';
import type { PetPage } from '@/domain/pet';
import { useInfinitePages } from '@/shared/ui/InfiniteScroll';
export function usePetPages<T extends { id: string }>(
  load: (page: number, signal: AbortSignal) => Promise<PetPage<T>>,
) {
  const adapted = useCallback(
    async (page: number, signal: AbortSignal) => {
      const data = await load(page, signal);
      return { items: data.records, total: data.total };
    },
    [load],
  );
  const pages = useInfinitePages(adapted);
  const state =
    pages.result.status === 'ready'
      ? {
          status: 'ready' as const,
          data: { records: pages.result.data.items, total: pages.result.data.total },
        }
      : pages.result;
  return { ...pages, state, reload: pages.refresh };
}
