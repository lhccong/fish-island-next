import { createStore } from 'zustand/vanilla';
import type { RedPacketDetail, RedPacketPort } from '@/domain/chat';

interface PacketState {
  detail: RedPacketDetail | null;
  loading: boolean;
  error: string;
  grabbing: boolean;
  amount: number | null;
  grabError: string;
}
const initial: PacketState = {
  detail: null,
  loading: false,
  error: '',
  grabbing: false,
  amount: null,
  grabError: '',
};
function errorText(error: unknown) {
  return error instanceof Error ? error.message : '红包操作失败，请重试';
}
function createEntry(id: string, port: RedPacketPort) {
  const store = createStore<PacketState>(() => initial);
  let detailRequest: AbortController | null = null;
  let grabRequest: AbortController | null = null;
  let references = 0;
  const load = async () => {
    if (detailRequest) return;
    const request = new AbortController();
    detailRequest = request;
    store.setState({ loading: true, error: '' });
    try {
      const detail = await port.detail(id, request.signal);
      if (!request.signal.aborted) store.setState({ detail });
    } catch (error) {
      if (!request.signal.aborted) store.setState({ error: errorText(error) });
    } finally {
      if (detailRequest === request) {
        detailRequest = null;
        store.setState({ loading: false });
      }
    }
  };
  const cancel = () => {
    detailRequest?.abort();
    grabRequest?.abort();
    detailRequest = grabRequest = null;
    store.setState({ loading: false, grabbing: false });
  };
  return {
    store,
    load,
    cancel,
    get active() {
      return references > 0 || store.getState().grabbing;
    },
    retain() {
      references++;
      if (!store.getState().detail && !store.getState().error) void load();
      return () => {
        references--;
        // A pending write belongs to the account, not a virtualized message row.
        if (!references && detailRequest && !grabRequest) {
          detailRequest.abort();
          detailRequest = null;
          store.setState({ loading: false });
        }
      };
    },
    async grab(answer: string) {
      const state = store.getState();
      if (
        grabRequest ||
        state.amount !== null ||
        !state.detail ||
        state.loading ||
        state.detail.status !== 0 ||
        state.detail.remainingCount === 0
      )
        return;
      if (state.detail.type === 3 && !answer.trim()) {
        store.setState({ grabError: '请先输入答案' });
        return;
      }
      const request = new AbortController();
      grabRequest = request;
      store.setState({ grabbing: true, grabError: '' });
      try {
        const amount = await port.grab(
          id,
          state.detail.type === 3 ? answer.trim() : '',
          request.signal,
        );
        if (!request.signal.aborted) store.setState({ amount });
      } catch (error) {
        if (!request.signal.aborted) store.setState({ grabError: errorText(error) });
      } finally {
        if (grabRequest === request) {
          grabRequest = null;
          store.setState({ grabbing: false });
          if (!request.signal.aborted) await load();
        }
      }
    },
  };
}

export function createRedPacketController(port: RedPacketPort, accountId: string) {
  const entries = new Map<string, ReturnType<typeof createEntry>>();
  return {
    accountId,
    port,
    entry(id: string) {
      let entry = entries.get(id);
      if (!entry) {
        // Bound cached, unmounted packets; active rows and pending writes are retained.
        if (entries.size >= 500) {
          for (const [key, value] of entries) {
            if (!value.active) {
              value.cancel();
              entries.delete(key);
              break;
            }
          }
        }
        entry = createEntry(id, port);
        entries.set(id, entry);
      }
      return entry;
    },
    dispose() {
      for (const entry of entries.values()) entry.cancel();
    },
  };
}
export type RedPacketController = ReturnType<typeof createRedPacketController>;
