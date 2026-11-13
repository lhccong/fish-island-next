import type { ChatConnection, ChatEvent, ChatRealtimePort, ChatHistoryPort } from '@/domain/chat';
import { createSendController } from './send-controller';
import type { ChatSendPort } from '@/domain/chat';
import { createMessageStore } from './message-store';
import { createHistoryController } from './history-controller';

export function createChatRealtimeController(
  port: ChatRealtimePort,
  historyPort?: ChatHistoryPort,
  sendPort?: ChatSendPort,
) {
  const model = createMessageStore();
  const sender = createSendController(sendPort, model);
  let connection: ChatConnection | null = null;
  let queue: ChatEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    model.apply(queue);
    queue = [];
    for (const [id, timeout] of pending) {
      if (
        Object.values(model.store.getState().messages).find((message) => message.id === id)?.revoked
      ) {
        clearTimeout(timeout);
        pending.delete(id);
      }
    }
  };
  const history = createHistoryController(
    historyPort,
    () => model.store.getState().ids.length,
    (messages) => {
      flush();
      model.apply(messages.map((message) => ({ type: 'message', message })));
    },
  );
  const stop = () => {
    sender.reset();
    history.reset();
    connection?.close();
    connection = null;
    clearTimeout(timer);
    timer = undefined;
    queue = [];
    pending.forEach(clearTimeout);
    pending.clear();
    model.reset();
  };
  return {
    sender,
    history,
    store: model.store,
    start() {
      if (connection) return stop;
      connection = port.connect(
        (event) => {
          queue.push(event);
          if (queue.length >= 200) flush();
          else timer ??= setTimeout(flush, 16);
        },
        (state) => model.store.setState({ connection: state }),
      );
      return stop;
    },
    retry() {
      connection?.retry();
    },
    revoke(id: string, userId: string) {
      const state = model.store.getState();
      const message = Object.values(state.messages).find((message) => message.id === id);
      if (!message || message.revoked || message.senderId !== userId || pending.has(id)) return;
      const update = (value: 'pending' | 'error') =>
        model.store.setState((current) => ({
          revokeState: { ...current.revokeState, [id]: value },
        }));
      if (!connection?.revoke(id)) return update('error');
      update('pending');
      pending.set(
        id,
        setTimeout(() => {
          pending.delete(id);
          const message = Object.values(model.store.getState().messages).find(
            (message) => message.id === id,
          );
          if (message && !message.revoked) update('error');
        }, 10000),
      );
    },
  };
}
export type ChatRealtimeController = ReturnType<typeof createChatRealtimeController>;
