import { useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './InfiniteScroll.module.css';

export function InfiniteScroll({
  enabled = true,
  hasMore,
  loading = false,
  error = '',
  onLoadMore,
  label = '列表',
  summary,
  edge = 'end',
}: {
  enabled?: boolean;
  hasMore: boolean;
  loading?: boolean;
  error?: string;
  onLoadMore: () => void;
  label?: string;
  summary?: string;
  edge?: 'start' | 'end';
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = sentinel.current;
    if (!enabled || !hasMore || loading || error || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      {
        root: target.closest('[data-radix-scroll-area-viewport]'),
        rootMargin: edge === 'start' ? '80px 0px 0px 0px' : '0px 0px 80px 0px',
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, hasMore, loading, error, onLoadMore, edge]);
  return (
    <div className={styles.end} data-scroll-pagination={label}>
      <div ref={sentinel} className={styles.sentinel} aria-hidden="true" />
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={onLoadMore}>
            重试{label}
          </Button>
        </div>
      ) : (
        <p>
          {loading ? `正在加载${label}…` : (summary ?? (hasMore ? '继续下滑加载' : '已全部加载'))}
        </p>
      )}
    </div>
  );
}
