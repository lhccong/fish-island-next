import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { ReactNode } from 'react';
import type { ShopPage } from '@/domain/points-shop';
import { Button } from '@/shared/ui/Button';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Shop.module.css';

export function ShopList<T extends { id: string }>({
  load,
  label,
  empty,
  render,
}: {
  load: (page: number, signal: AbortSignal) => Promise<ShopPage<T>>;
  label: string;
  empty: string;
  render: (items: T[]) => ReactNode;
}) {
  const pages = useInfinitePages(load);
  return (
    <ScrollArea label={label} gutter="reserved" className={styles.scroll ?? ''}>
      <div className={styles.body}>
        {pages.result.status === 'loading' && <LoadingIndicator>正在加载{label}…</LoadingIndicator>}
        {pages.result.status === 'error' && (
          <div role="alert">
            <p>{pages.result.message}</p>
            <Button variant="secondary" onClick={pages.refresh}>
              重新读取
            </Button>
          </div>
        )}
        {pages.result.status === 'ready' && (
          <>
            {pages.result.data.items.length ? (
              render(pages.result.data.items)
            ) : (
              <div>
                <p>{empty}</p>
                <Button variant="secondary" onClick={pages.refresh}>
                  重新读取
                </Button>
              </div>
            )}
            <InfiniteScroll
              label={label}
              hasMore={pages.hasMore}
              loading={pages.loadingMore}
              error={pages.error}
              onLoadMore={pages.loadMore}
            />
          </>
        )}
      </div>
    </ScrollArea>
  );
}
