import { createStore } from 'zustand/vanilla';
import type { ChatHistoryPort, ReceivedMessage } from '@/domain/chat';

interface HistoryState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  initialized: boolean;
  hasMore: boolean;
  limited: boolean;
}
const initial = (): HistoryState => ({
  status: 'idle',
  error: '',
  initialized: false,
  hasMore: true,
  limited: false,
});
export function createHistoryController(
  port: ChatHistoryPort | undefined,
  count: () => number,
  merge: (messages: readonly ReceivedMessage[]) => void,
) {
  const store = createStore<HistoryState>(initial);
  const seen = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  let request: AbortController | null = null;
  let generation = 0;
  let active = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    generation++;
    request?.abort();
    request = null;
    clearTimeout(timer);
    if (store.getState().status === 'loading')
      store.setState({ status: store.getState().initialized ? 'ready' : 'idle' });
  };
  const loadMore = async () => {
    const state = store.getState();
    if (!port || !active || request || !state.hasMore) return;
    const capacity = 1000 - count();
    if (capacity <= 0 && state.initialized) {
      store.setState({ status: 'ready', hasMore: false, limited: true });
      return;
    }
    const version = ++generation;
    const controller = new AbortController();
    request = controller;
    store.setState({ status: 'loading', error: '' });
    try {
      const page = await port.loadHistory({
        conversationId: 'public',
        cursor,
        limit: state.initialized ? Math.min(50, capacity) : 50,
        signal: controller.signal,
      });
      if (version !== generation || controller.signal.aborted) return;
      const hasNew = page.messages.some((message) => !seen.has(message.id));
      page.messages.forEach((message) => seen.add(message.id));
      merge(page.messages);
      const next = page.nextCursor;
      const hasMore = hasNew && next !== null && next !== cursor && !cursors.has(next);
      if (next) cursors.add(next);
      cursor = next;
      const limited = count() >= 1000;
      store.setState({
        status: 'ready',
        initialized: true,
        error: '',
        hasMore: hasMore && !limited,
        limited,
      });
    } catch (error) {
      if (version === generation && !controller.signal.aborted)
        store.setState({
          status: 'error',
          error: error instanceof Error ? error.message : '历史消息加载失败，请重试',
        });
    } finally {
      if (version === generation) request = null;
    }
  };
  return {
    store,
    loadMore,
    activate() {
      if (!active) {
        cancel();
        seen.clear();
        cursors.clear();
        cursor = null;
        store.setState(initial());
      }
      active++;
      if (store.getState().status === 'idle')
        timer = setTimeout(() => {
          void loadMore();
        }, 0);
      return () => {
        active = Math.max(0, active - 1);
        if (!active) cancel();
      };
    },
    reset() {
      cancel();
      seen.clear();
      cursors.clear();
      cursor = null;
      store.setState(initial());
    },
  };
}
