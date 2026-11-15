import { useCallback } from 'react';
import type { ForumPort } from '@/domain/forum';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Button } from '@/shared/ui/Button';
import styles from './Forum.module.css';
export function ForumTags({
  service,
  value,
  onChange,
}: {
  service: ForumPort;
  value: string;
  onChange: (tag: string) => void;
}) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => service.tags(page, signal),
    [service],
  );
  const tags = useInfinitePages(load);
  return (
    <div className={styles.tagFilter}>
      <span>标签：</span>
      <div className={styles.tagOptions}>
        <Button variant="secondary" aria-pressed={!value} onClick={() => onChange('')}>
          全部
        </Button>
        {tags.result.status === 'ready' &&
          tags.result.data.items.map((t) => (
            <Button
              variant="secondary"
              key={t.id}
              aria-pressed={t.name === value}
              onClick={() => onChange(t.name)}
            >
              {t.name}
            </Button>
          ))}
      </div>
      {tags.result.status === 'loading' ? (
        <LoadingIndicator compact>正在加载标签…</LoadingIndicator>
      ) : (
        (tags.hasMore || tags.error || tags.result.status === 'error') && (
          <InfiniteScroll
            label="标签"
            hasMore={tags.hasMore}
            loading={tags.loadingMore}
            error={tags.result.status === 'error' ? tags.result.message : tags.error}
            onLoadMore={tags.result.status === 'error' ? tags.refresh : tags.loadMore}
          />
        )
      )}
    </div>
  );
}
