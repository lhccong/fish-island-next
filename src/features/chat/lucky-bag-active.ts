import { createStore } from 'zustand/vanilla';
import { parseMessageContent, type LuckyBagDetail, type LuckyBagPort } from '@/domain/chat';
import type { ChatRealtimeController } from './realtime-controller';

interface ActiveState {
  bags: readonly LuckyBagDetail[];
  count: number;
  loading: boolean;
  error: string;
}
export function createActiveLuckyBags(port: LuckyBagPort, accountId: string) {
  const store = createStore<ActiveState>(() => ({ bags: [], count: 0, loading: false, error: '' }));
  const joined = new Set<string>();
  const updates = new Map<string, { revision: number; bag: LuckyBagDetail }>();
  let revision = 0;
  let request: AbortController | null = null;
  let pending = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  let unsubscribeConnection: (() => void) | undefined;
  const commit = (values: readonly LuckyBagDetail[]) => {
    clearTimeout(expiryTimer);
    const now = Date.now();
    const bags = [...new Map(values.map((bag) => [bag.id, bag])).values()]
      .filter((bag) => bag.status === 0 && bag.drawTime > now)
      .map((bag) => (joined.has(bag.id) ? { ...bag, joined: true } : bag));
    store.setState({ bags, count: bags.filter((bag) => !bag.joined).length });
    const next = Math.min(...bags.map((bag) => bag.drawTime));
    if (Number.isFinite(next))
      expiryTimer = setTimeout(
        () => commit(store.getState().bags),
        Math.min(2147483647, next - now + 10),
      );
  };
  const load = async (): Promise<void> => {
    if (!accountId) return;
    if (request) {
      pending = true;
      return;
    }
    const current = new AbortController();
    const since = revision;
    request = current;
    store.setState({ loading: true, error: '' });
    try {
      const bags = await port.active(current.signal);
      if (!current.signal.aborted) {
        const merged = new Map(bags.map((bag) => [bag.id, bag]));
        for (const [id, update] of updates) {
          if (update.revision > since) merged.set(id, update.bag);
          else updates.delete(id);
        }
        for (const bag of bags) if (bag.joined) joined.add(bag.id);
        commit([...merged.values()]);
        const live = new Set(store.getState().bags.map((bag) => bag.id));
        for (const id of joined) if (!live.has(id)) joined.delete(id);
      }
    } catch (error) {
      if (!current.signal.aborted)
        store.setState({
          error: error instanceof Error ? error.message : '福袋列表加载失败，请重试',
        });
    } finally {
      if (request === current) {
        request = null;
        store.setState({ loading: false });
        if (pending) {
          pending = false;
          void load();
        }
      }
    }
  };
  const schedule = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      void load();
    }, 150);
  };
  return {
    store,
    load,
    update(bag: LuckyBagDetail) {
      if (bag.joined) joined.add(bag.id);
      // Only changes made during a read need to override that potentially older snapshot.
      revision++;
      if (request) updates.set(bag.id, { revision, bag });
      commit([...store.getState().bags.filter((item) => item.id !== bag.id), bag]);
    },
    start(chat: Pick<ChatRealtimeController, 'subscribeIncoming' | 'store'>) {
      if (!accountId || unsubscribe) return;
      void load();
      unsubscribe = chat.subscribeIncoming((message) => {
        if (
          parseMessageContent(message.content).some((part) => part.kind === 'lucky-bag') ||
          (message.senderId === '-1' && message.content.includes('福袋'))
        )
          schedule();
      });
      unsubscribeConnection = chat.store.subscribe((state, previous) => {
        if (state.connection === 'connected' && previous.connection !== 'connected') schedule();
      });
    },
    dispose() {
      unsubscribe?.();
      unsubscribe = undefined;
      unsubscribeConnection?.();
      unsubscribeConnection = undefined;
      clearTimeout(expiryTimer);
      clearTimeout(refreshTimer);
      pending = false;
      request?.abort();
      request = null;
      updates.clear();
      store.setState({ loading: false });
    },
  };
}
