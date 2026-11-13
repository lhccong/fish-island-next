import { describe, expect, it } from 'vitest';
import type { ChatEvent } from '@/domain/chat';
import { createMessageStore } from './message-store';

const event = (id: string, createdAt = 1, content = 'same'): ChatEvent => ({
  type: 'message',
  message: { id, createdAt, content, senderId: '1', senderName: '合成岛友', revoked: false },
});
describe('inbound idempotency', () => {
  it('deduplicates within/across batches, keeps distinct same-text IDs and row identities', () => {
    const model = createMessageStore();
    model.apply([event('a'), event('a'), event('b')]);
    const before = model.store.getState();
    model.apply([event('a', 1, 'changed')]);
    expect(model.store.getState()).toBe(before);
    expect(before.ids).toEqual(['a', 'b']);
    model.apply([event('c')]);
    expect(model.store.getState().messages.a).toBe(before.messages.a);
  });
  it('handles repeated revoke before/after arrival and prevents resurrection', () => {
    const model = createMessageStore();
    model.apply([{ type: 'revoke', id: 'a' }, { type: 'revoke', id: 'a' }, event('a')]);
    expect(model.store.getState().messages.a).toMatchObject({ revoked: true, content: '' });
    model.apply([event('b'), { type: 'revoke', id: 'b' }, event('b')]);
    const before = model.store.getState();
    model.apply([{ type: 'revoke', id: 'b' }]);
    expect(model.store.getState()).toBe(before);
    expect(before.messages.b).toMatchObject({ revoked: true, content: '' });
  });
  it('sorts out-of-order frames and bounds the window without reintroducing evicted replays', () => {
    const model = createMessageStore();
    model.apply(Array.from({ length: 1200 }, (_, i) => event(String(i), 1200 - i)));
    expect(model.store.getState().ids).toHaveLength(1000);
    expect(model.store.getState().ids[0]).toBe('999');
    model.apply([event('1199', 1)]);
    expect(model.store.getState().messages['1199']).toBeUndefined();
    model.reset();
    model.apply([event('1199', 1)]);
    expect(model.store.getState().ids).toEqual(['1199']);
  });
});
