import { useStore } from 'zustand';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { useChatRealtime } from './realtime-context';

export function HistoryBoundary() {
  const { controller } = useChatRealtime();
  const history = controller.history;
  const state = useStore(history.store, (value) => value);
  return (
    <InfiniteScroll
      label="历史消息"
      edge="start"
      enabled={state.initialized}
      loading={state.status === 'idle' || state.status === 'loading'}
      hasMore={state.hasMore}
      error={state.error}
      onLoadMore={history.loadMore}
      summary={
        state.limited
          ? '已达到当前消息窗口上限（1000条）'
          : state.hasMore
            ? '上滑查看更早消息'
            : '历史消息已全部加载'
      }
    />
  );
}
