import { createStore } from 'zustand/vanilla';
import type { ChatRemarksPort, UserRemarks } from '@/domain/chat';

export function createRemarksController(port: ChatRemarksPort) {
  const store = createStore<{
    remarks: UserRemarks;
    status: 'loading' | 'error' | 'ready';
    saving: boolean;
    error: string;
  }>(() => ({ remarks: {}, status: 'loading', saving: false, error: '' }));
  let pending: AbortController | undefined;
  const errorText = (reason: unknown) =>
    reason instanceof Error && !(reason instanceof TypeError) && !(reason instanceof DOMException)
      ? reason.message
      : '备注请求失败，请检查网络后重试';
  return {
    store,
    async load() {
      if (store.getState().saving) return;
      pending?.abort();
      const request = new AbortController();
      pending = request;
      store.setState({ status: 'loading', error: '' });
      try {
        const remarks = await port.load(request.signal);
        if (!request.signal.aborted) store.setState({ remarks, status: 'ready' });
      } catch (reason) {
        if (!request.signal.aborted) store.setState({ status: 'error', error: errorText(reason) });
      }
    },
    async save(id: string, value: string) {
      const state = store.getState();
      if (state.status !== 'ready' || state.saving || !id) return false;
      const remarks = { ...state.remarks };
      if (value.trim()) remarks[id] = value.trim();
      else delete remarks[id];
      const request = new AbortController();
      pending = request;
      store.setState({ saving: true, error: '' });
      try {
        await port.save(remarks, request.signal);
        if (request.signal.aborted) return false;
        store.setState({ remarks, saving: false });
        return true;
      } catch (reason) {
        if (!request.signal.aborted) store.setState({ saving: false, error: errorText(reason) });
        return false;
      }
    },
    dispose() {
      pending?.abort();
      store.setState({ remarks: {}, status: 'loading', saving: false, error: '' });
    },
  };
}
export type RemarksController = ReturnType<typeof createRemarksController>;
