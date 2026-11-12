import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
export function DonationEnd({
  enabled,
  onLoadMore,
  hasMore,
  loaded,
  total,
}: {
  enabled: boolean;
  onLoadMore: () => void;
  loaded: number;
  total: number;
  hasMore: boolean;
}) {
  const summary =
    loaded > 0
      ? hasMore
        ? `已显示 ${loaded} / ${total} 条，继续下滑加载`
        : `已全部加载，共 ${loaded} 条`
      : undefined;
  return (
    <InfiniteScroll
      label="打赏记录"
      enabled={enabled}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      {...(summary !== undefined ? { summary } : {})}
    />
  );
}
