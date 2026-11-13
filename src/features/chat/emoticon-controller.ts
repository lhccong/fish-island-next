import { createStore } from 'zustand/vanilla';
import type { ChatEmoticonPort } from '@/domain/chat';

export function createEmoticonController(port: ChatEmoticonPort, ownerId: string) {
  const store = createStore(() => ({ revision: 0, pending: false, feedback: '', error: false }));
  let active: AbortController | null = null;
  let disposed = false;
  async function mutate(action: (signal: AbortSignal) => Promise<void>, success: string) {
    if (disposed || active || !ownerId) return;
    const request = new AbortController();
    active = request;
    store.setState({ pending: true, feedback: '正在保存表情包…', error: false });
    try {
      await action(request.signal);
      if (!request.signal.aborted)
        store.setState((s) => ({ revision: s.revision + 1, feedback: success }));
    } catch (error) {
      if (!request.signal.aborted)
        store.setState({
          feedback: error instanceof Error ? error.message : '保存失败，请重试',
          error: true,
        });
    } finally {
      if (!request.signal.aborted) store.setState({ pending: false });
      if (active === request) active = null;
    }
  }
  return {
    port,
    store,
    start() {
      disposed = false;
    },
    add: (url: string) => mutate((signal) => port.add(url, signal), '已添加到表情包'),
    remove: (id: string) => mutate((signal) => port.remove(id, signal), '已移除表情包'),
    dispose() {
      disposed = true;
      active?.abort();
      active = null;
      store.setState({ pending: false });
    },
  };
}
export type EmoticonController = ReturnType<typeof createEmoticonController>;
