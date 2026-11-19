import type {
  BigFishEvent,
  ChatConnection,
  ChatEvent,
  ChatRealtimePort,
  ChatHistoryPort,
  ReceivedMessage,
  OnlineMembersPort,
} from '@/domain/chat';
import { hasRewardMessageContent } from '@/domain/chat';
import { createSendController } from './send-controller';
import type { ChatSendPort } from '@/domain/chat';
import { createMessageStore } from './message-store';
import { createHistoryController } from './history-controller';
import { createMembersController } from './members-controller';

export function createChatRealtimeController(
  port: ChatRealtimePort,
  historyPort?: ChatHistoryPort,
  sendPort?: ChatSendPort,
  membersPort?: OnlineMembersPort,
) {
  const members = createMembersController(membersPort);
  const model = createMessageStore();
  const sender = createSendController(sendPort, model);
  const incoming = new Set<(message: ReceivedMessage) => void>();
  const bigFish = new Set<(event: BigFishEvent) => void>();
  const bigFishPhases = new Map<string, BigFishEvent['status']>();
  let connection: ChatConnection | null = null;
  let queue: ChatEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const existing = new Set(
      Object.values(model.store.getState().messages).map((message) => message.id),
    );
    const fresh = new Set(
      queue.flatMap((event) =>
        event.type === 'message' && !existing.has(event.message.id) ? [event.message.id] : [],
      ),
    );
    model.apply(queue);
    for (const message of Object.values(model.store.getState().messages)) {
      if (fresh.has(message.id) && !message.revoked)
        incoming.forEach((listener) => listener(message));
    }
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
  const enqueue = (event: ChatEvent) => {
    queue.push(event);
    if (queue.length >= 200) flush();
    else timer ??= setTimeout(flush, 16);
  };
  let historyAfter: string | null = null;
  const history = createHistoryController(
    historyPort && {
      loadHistory(input) {
        flush();
        historyAfter = input.cursor === null ? (model.store.getState().ids.at(-1) ?? null) : null;
        return historyPort.loadHistory(input);
      },
    },
    () => model.store.getState().ids.length,
    (messages) => {
      flush();
      model.apply(
        [...messages].reverse().map((message) => ({ type: 'message', message })),
        historyAfter,
      );
    },
  );
  const stop = () => {
    members.reset();
    sender.reset();
    history.reset();
    connection?.close();
    connection = null;
    clearTimeout(timer);
    timer = undefined;
    queue = [];
    pending.forEach(clearTimeout);
    pending.clear();
    bigFishPhases.clear();
    model.reset();
  };
  return {
    members,
    sender,
    subscribeIncoming(listener: (message: ReceivedMessage) => void) {
      incoming.add(listener);
      return () => {
        incoming.delete(listener);
      };
    },
    subscribeBigFish(listener: (event: BigFishEvent) => void) {
      bigFish.add(listener);
      return () => {
        bigFish.delete(listener);
      };
    },
    history,
    store: model.store,
    setBlockedSenders: model.setBlockedSenders,
    start() {
      if (connection) return stop;
      connection = port.connect(
        (event) => {
          if (event.type === 'big-fish') {
            const previous = bigFishPhases.get(event.id);
            if (previous && (previous !== 'thinking' || event.status === 'thinking')) return;
            bigFishPhases.set(event.id, event.status);
            if (bigFishPhases.size > 128) bigFishPhases.delete(bigFishPhases.keys().next().value!);
            if (event.status === 'speech') enqueue({ type: 'message', message: event.message });
            bigFish.forEach((listener) => listener(event));
            return;
          }
          if (event.type !== 'message' && event.type !== 'revoke') {
            members.receive(event);
            return;
          }
          enqueue(event);
        },
        (state) => model.store.setState({ connection: state }),
      );
      return stop;
    },
    retry() {
      connection?.retry();
    },
    revoke(id: string, userId: string, role?: string) {
      const state = model.store.getState();
      const message = Object.values(state.messages).find((message) => message.id === id);
      if (
        !message ||
        message.revoked ||
        (role !== 'admin' &&
          (message.senderId !== userId ||
            (!message.poke && hasRewardMessageContent(message.content)))) ||
        pending.has(id)
      )
        return;
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
