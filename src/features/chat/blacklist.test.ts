import { expect, it } from 'vitest';
import type { ReceivedMessage } from '@/domain/chat';
import { createMessageStore } from './message-store';

const message = (id: string, senderId: string, content = id): ReceivedMessage => ({
  id,
  senderId,
  senderName: senderId,
  content,
  createdAt: 1,
  revoked: false,
});
const apply = (
  model: ReturnType<typeof createMessageStore>,
  messages: ReceivedMessage[],
  historyAfter?: string | null,
) =>
  model.apply(
    messages.map((message) => ({ type: 'message', message })),
    historyAfter,
  );

it('hides blocked history and live messages without dropping entities or pagination order', () => {
  const model = createMessageStore();
  model.setBlockedSenders(['blocked']);
  apply(model, [message('2', 'blocked'), message('3', 'friend')]);
  apply(model, [message('0', 'friend'), message('1', 'blocked')], null);
  apply(model, [message('4', 'blocked')]);
  const state = model.store.getState();
  expect(state.ids).toEqual(['0', '1', '2', '3', '4']);
  expect(state.visibleIds).toEqual(['0', '3']);
  expect(Object.keys(state.messages)).toHaveLength(5);
  model.apply([{ type: 'revoke', id: '2' }]);
  expect(model.store.getState().visibleIds).toEqual(['0', '3']);
  model.setBlockedSenders([]);
  expect(model.store.getState().visibleIds).toEqual(state.ids);
  expect(model.store.getState().messages['2']!.revoked).toBe(true);
});

it('rebuilds repetition representatives and participants using only unblocked senders', () => {
  const model = createMessageStore();
  apply(model, [
    message('1', 'blocked', 'same'),
    message('2', 'a', 'same'),
    message('3', 'b', 'same'),
  ]);
  expect(model.store.getState().visibleIds).toEqual(['1']);
  model.setBlockedSenders(['blocked']);
  expect(model.store.getState().visibleIds).toEqual(['2', '3']);
  expect(model.store.getState().repetitions).toEqual({ '3': ['2', '3'] });
  apply(model, [message('4', 'blocked', 'same'), message('5', 'c', 'same')]);
  expect(model.store.getState().visibleIds).toEqual(['2']);
  expect(model.store.getState().repetitions).toEqual({ '2': ['2', '3', '5'] });
  model.updateDelivery('4', 'sent');
  expect(model.store.getState().visibleIds).toEqual(['2']);
  model.setBlockedSenders(['blocked', 'a', 'b', 'c']);
  expect(model.store.getState().visibleIds).toEqual([]);
  expect(model.store.getState().repetitions).toEqual({});
});

it('preserves visible anchors and avoids updates for unchanged blacklists', () => {
  const model = createMessageStore();
  apply(model, [message('1', 'blocked'), message('2', 'friend'), message('3', 'other')]);
  const before = model.store.getState();
  model.setBlockedSenders(['blocked']);
  const hidden = model.store.getState();
  expect(hidden.viewFirstItemIndex).toBe(before.viewFirstItemIndex + 1);
  expect(hidden.messages).toBe(before.messages);
  expect(hidden.ids).toBe(before.ids);
  model.setBlockedSenders(['blocked', 'blocked']);
  expect(model.store.getState()).toBe(hidden);
  model.setBlockedSenders([]);
  expect(model.store.getState().viewFirstItemIndex).toBe(before.viewFirstItemIndex);
  model.setBlockedSenders(['blocked']);
  model.reset();
  expect(model.store.getState().blockedSenders.size).toBe(0);
  apply(model, [message('1', 'blocked')]);
  expect(model.store.getState().visibleIds).toEqual(['1']);
});
