import { createStore } from 'zustand/vanilla';

type InvitationState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'ready'; code: string }
  | { kind: 'error'; message: string };

export function createInvitationController(fetchCode: (signal: AbortSignal) => Promise<string>) {
  const store = createStore<InvitationState>(() => ({ kind: 'idle' }));
  let request: AbortController | null = null;

  function reset() {
    request?.abort();
    request = null;
    store.setState({ kind: 'idle' }, true);
  }

  async function load() {
    if (request || store.getState().kind === 'ready') return;
    const controller = new AbortController();
    request = controller;
    store.setState({ kind: 'loading' }, true);
    try {
      const code = await fetchCode(controller.signal);
      if (!controller.signal.aborted) store.setState({ kind: 'ready', code }, true);
    } catch (error) {
      if (!controller.signal.aborted) {
        store.setState(
          {
            kind: 'error',
            message: error instanceof Error ? error.message : '无法取得邀请码，请重试',
          },
          true,
        );
      }
    } finally {
      if (request === controller) request = null;
    }
  }

  return { store, reset, load };
}
