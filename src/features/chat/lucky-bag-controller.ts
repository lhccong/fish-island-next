import { createStore } from 'zustand/vanilla';
import type { LuckyBagDetail, LuckyBagPort } from '@/domain/chat';
import { createActiveLuckyBags } from './lucky-bag-active';

interface BagState {
  detail: LuckyBagDetail | null;
  loading: boolean;
  error: string;
  joining: boolean;
  feedback: string;
  joinError: string;
}
function createEntry(
  id: string,
  port: LuckyBagPort,
  initialDetail: LuckyBagDetail | undefined,
  onDetail: (bag: LuckyBagDetail) => void,
) {
  const store = createStore<BagState>(() => ({
    detail: initialDetail ?? null,
    loading: false,
    error: '',
    joining: false,
    feedback: '',
    joinError: '',
  }));
  let read: AbortController | null = null;
  let write: AbortController | null = null;
  let references = 0;
  let joined = initialDetail?.joined ?? false;
  const load = async () => {
    if (read) return;
    const request = new AbortController();
    read = request;
    store.setState({ loading: true, error: '' });
    try {
      const detail = await port.detail(id, request.signal);
      if (!request.signal.aborted) {
        joined ||= detail.joined;
        store.setState({ detail: { ...detail, joined } });
        onDetail({ ...detail, joined });
      }
    } catch (error) {
      if (!request.signal.aborted)
        store.setState({ error: error instanceof Error ? error.message : '福袋加载失败，请重试' });
    } finally {
      if (read === request) {
        read = null;
        store.setState({ loading: false });
      }
    }
  };
  return {
    store,
    load,
    acceptSnapshot(detail: LuckyBagDetail) {
      joined ||= detail.joined;
      store.setState({ detail: { ...detail, joined } });
    },
    get active() {
      return references > 0 || !!read || !!write;
    },
    retain() {
      references++;
      if (!store.getState().detail && !store.getState().error) void load();
      return () => {
        references--;
      };
    },
    async join() {
      const state = store.getState();
      if (
        write ||
        state.loading ||
        !state.detail ||
        state.detail.joined ||
        state.detail.status !== 0 ||
        state.detail.drawTime <= Date.now()
      )
        return;
      const request = new AbortController();
      write = request;
      // A pre-join snapshot must never overwrite the confirmed participation.
      read?.abort();
      read = null;
      store.setState({ joining: true, loading: false, feedback: '', joinError: '' });
      try {
        await port.join(id, request.signal);
        if (!request.signal.aborted) {
          joined = true;
          store.setState((current) => ({
            detail: current.detail
              ? {
                  ...current.detail,
                  joined: true,
                  participantCount: current.detail.participantCount + 1,
                }
              : null,
            feedback: '参与成功，等待开奖！',
          }));
          const confirmed = store.getState().detail;
          if (confirmed) onDetail(confirmed);
        }
      } catch (error) {
        if (!request.signal.aborted)
          store.setState({
            joinError: error instanceof Error ? error.message : '参与失败，请刷新详情后重试',
          });
      } finally {
        if (write === request) {
          write = null;
          store.setState({ joining: false });
          if (!request.signal.aborted) await load();
        }
      }
    },
    cancel() {
      read?.abort();
      write?.abort();
      read = write = null;
      store.setState({ loading: false, joining: false });
    },
  };
}
export function createLuckyBagController(port: LuckyBagPort, accountId: string) {
  const entries = new Map<string, ReturnType<typeof createEntry>>();
  const active = createActiveLuckyBags(port, accountId);
  return {
    port,
    accountId,
    active,
    entry(id: string, initialDetail?: LuckyBagDetail) {
      let entry = entries.get(id);
      if (!entry) {
        if (entries.size >= 500)
          for (const [key, value] of entries) {
            if (!value.active) {
              value.cancel();
              entries.delete(key);
              break;
            }
          }
        entry = createEntry(id, port, initialDetail, active.update);
        entries.set(id, entry);
      }
      return entry;
    },
    dispose() {
      active.dispose();
      for (const entry of entries.values()) entry.cancel();
    },
  };
}
export type LuckyBagController = ReturnType<typeof createLuckyBagController>;
