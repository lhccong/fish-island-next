import { projectRepetitions, type RepetitionView } from './repetition';
import { createStore } from 'zustand/vanilla';
import type { ChatConnectionState, ChatEvent, ReceivedMessage } from '@/domain/chat';

interface MessageState extends RepetitionView {
  firstItemIndex: number;
  ids: readonly string[];
  messages: Readonly<Record<string, ReceivedMessage>>;
  connection: ChatConnectionState;
  revokeState: Readonly<Record<string, 'pending' | 'error'>>;
}
export function createMessageStore() {
  const store = createStore<MessageState>(() => ({
    ...projectRepetitions([], {}),
    firstItemIndex: 1000000,
    ids: [],
    messages: Object.create(null),
    connection: 'closed',
    revokeState: {},
  }));
  const tombstones = new Set<string>();
  const evictedIds = new Set<string>();
  return {
    store,
    updateDelivery(key: string, delivery: ReceivedMessage['delivery'], sendError?: string) {
      const state = store.getState();
      if (!state.messages[key]) return;
      const messages = {
        ...state.messages,
        [key]: { ...state.messages[key], delivery, sendError },
      };
      store.setState({ messages, ...projectRepetitions(state.ids, messages, state) });
    },
    reset() {
      tombstones.clear();
      evictedIds.clear();
      store.setState({
        ...projectRepetitions([], {}),
        firstItemIndex: 1000000,
        ids: [],
        messages: Object.create(null),
        connection: 'closed',
        revokeState: {},
      });
    },
    // historyAfter: undefined = live append; null = older page; key = latest-page boundary.
    apply(events: readonly ChatEvent[], historyAfter?: string | null) {
      const before = store.getState();
      const messages = Object.assign(
        Object.create(null) as Record<string, ReceivedMessage>,
        before.messages,
      );
      const revokeState = { ...before.revokeState };
      let changed = false;
      let added = false;
      const incoming: string[] = [];
      for (const event of events) {
        if (event.type === 'revoke') {
          tombstones.add(event.id);
          if (tombstones.size > 10000) tombstones.delete(tombstones.values().next().value!);
          const key =
            Object.keys(messages).find((key) => messages[key]!.id === event.id) ?? event.id;
          const existing = messages[key];
          if (existing && !existing.revoked) {
            messages[key] = { ...existing, content: '', revoked: true };
            changed = true;
          }
          if (revokeState[event.id]) {
            delete revokeState[event.id];
            changed = true;
          }
        } else {
          const message = event.message;
          const localKey = message.clientMessageId
            ? Object.keys(messages).find(
                (key) =>
                  messages[key]!.clientMessageId === message.clientMessageId &&
                  messages[key]!.senderId === message.senderId,
              )
            : undefined;
          if (localKey) {
            incoming.push(localKey);
            const existing = messages[localKey]!;
            // A canonical entity is broadcast only after persistence; either transport confirms it.
            messages[localKey] = {
              ...message,
              delivery: existing.delivery ? 'sent' : undefined,
              sendError: undefined,
              revoked: existing.revoked || tombstones.has(message.id),
              ...(existing.revoked || tombstones.has(message.id) ? { content: '' } : {}),
            };
            changed = true;
            continue;
          }
          incoming.push(message.id);
          if (messages[message.id] || evictedIds.has(message.id)) continue;
          messages[message.id] = tombstones.has(message.id)
            ? { ...message, content: '', revoked: true }
            : message;
          changed = added = true;
        }
      }
      if (!changed) return;
      let ids = before.ids;
      if (added) {
        const ordered = [...before.ids];
        const known = new Set(ordered);
        let position =
          historyAfter === undefined
            ? ordered.length
            : historyAfter === null
              ? 0
              : Math.max(0, ordered.indexOf(historyAfter) + 1);
        const pending: string[] = [];
        for (const key of incoming) {
          if (!messages[key]) continue;
          if (known.has(key)) {
            if (historyAfter !== undefined && ordered.includes(key)) {
              const anchor = ordered.indexOf(key);
              ordered.splice(anchor, 0, ...pending);
              position = anchor + pending.length + 1;
              pending.length = 0;
            }
          } else {
            known.add(key);
            pending.push(key);
          }
        }
        ordered.splice(position, 0, ...pending);
        const removable = ordered.filter(
          (key) => !['sending', 'failed'].includes(messages[key]!.delivery ?? ''),
        );
        const evicted = removable.slice(0, Math.max(0, ordered.length - 1000));
        for (const key of evicted) {
          evictedIds.add(messages[key]!.id);
          if (evictedIds.size > 10000) evictedIds.delete(evictedIds.values().next().value!);
          delete messages[key];
          delete revokeState[key];
        }
        ids = ordered.filter((key) => !!messages[key]);
      }
      const oldFirst = before.ids[0];
      const newFirst = ids[0];
      const prependCount = oldFirst ? ids.indexOf(oldFirst) : 0;
      const removedCount = newFirst ? before.ids.indexOf(newFirst) : 0;
      const firstItemIndex =
        before.firstItemIndex + (prependCount >= 0 ? -prependCount : Math.max(0, removedCount));
      store.setState({
        ids,
        messages,
        revokeState,
        firstItemIndex,
        ...projectRepetitions(ids, messages, before),
      });
    },
  };
}
