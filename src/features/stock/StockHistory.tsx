import { useCallback } from 'react';
import type { StockPort } from '@/domain/stock';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { Button } from '@/shared/ui/Button';
import { TradeList } from './TradeList';
import styles from './StockWorkspace.module.css';
export function StockHistory({ service }: { service: StockPort }) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => service.transactions(page, signal),
    [service],
  );
  const pages = useInfinitePages(load);
  return (
    <section aria-label="交易记录" className={styles.listPanel}>
      <h2>交易记录</h2>
      {pages.result.status === 'loading' ? (
        <p role="status">正在加载交易记录…</p>
      ) : pages.result.status === 'error' ? (
        <div role="alert">
          <p>{pages.result.message}</p>
          <Button onClick={pages.refresh}>重试交易记录</Button>
        </div>
      ) : (
        <>
          {pages.result.data.items.length ? (
            <TradeList trades={pages.result.data.items} />
          ) : (
            <p>暂无交易记录，买入后可在这里查看。</p>
          )}
          <InfiniteScroll
            label="交易记录"
            hasMore={pages.hasMore}
            loading={pages.loadingMore}
            error={pages.error}
            onLoadMore={pages.loadMore}
          />
        </>
      )}
    </section>
  );
}
