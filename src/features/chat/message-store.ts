import { createStore } from 'zustand/vanilla';
import type { ChatConnectionState, ChatEvent, ReceivedMessage } from '@/domain/chat';

export function compareMessages(a: ReceivedMessage, b: ReceivedMessage) {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id, 'en');
}
interface MessageState {
  firstItemIndex: number;
  ids: readonly string[];
  messages: Readonly<Record<string, ReceivedMessage>>;
  connection: ChatConnectionState;
  revokeState: Readonly<Record<string, 'pending' | 'error'>>;
}
export function createMessageStore() {
  const store = createStore<MessageState>(() => ({
    firstItemIndex: 1000000,
    ids: [],
    messages: Object.create(null),
    connection: 'closed',
    revokeState: {},
  }));
  const tombstones = new Set<string>();
  let floor: ReceivedMessage | null = null;
  return {
    store,
    reset() {
      tombstones.clear();
      floor = null;
      store.setState({
        firstItemIndex: 1000000,
        ids: [],
        messages: Object.create(null),
        connection: 'closed',
        revokeState: {},
      });
    },
    apply(events: readonly ChatEvent[]) {
      const before = store.getState();
      const messages = Object.assign(
        Object.create(null) as Record<string, ReceivedMessage>,
        before.messages,
      );
      const revokeState = { ...before.revokeState };
      let changed = false;
      let added = false;
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
            const existing = messages[localKey]!;
            // Confirmed entities replace previews, retaining the rendering key and HTTP lifecycle.
            messages[localKey] = {
              ...message,
              delivery: existing.delivery === 'failed' ? 'sent' : existing.delivery,
              sendError: existing.delivery === 'failed' ? undefined : existing.sendError,
              revoked: existing.revoked || tombstones.has(message.id),
              ...(existing.revoked || tombstones.has(message.id) ? { content: '' } : {}),
            };
            changed = true;
            continue;
          }
          if (
            messages[message.id] ||
            (floor && !message.delivery && compareMessages(message, floor) <= 0)
          )
            continue;
          messages[message.id] = tombstones.has(message.id)
            ? { ...message, content: '', revoked: true }
            : message;
          changed = added = true;
        }
      }
      if (!changed) return;
      let ids = before.ids;
      if (added) {
        const ordered = Object.keys(messages).sort((a, b) =>
          compareMessages(messages[a]!, messages[b]!),
        );
        const removable = ordered.filter(
          (key) => !['sending', 'failed'].includes(messages[key]!.delivery ?? ''),
        );
        const evicted = removable.slice(0, Math.max(0, ordered.length - 1000));
        for (const key of evicted) {
          floor = messages[key]!;
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
      store.setState({ ids, messages, revokeState, firstItemIndex });
    },
  };
}
