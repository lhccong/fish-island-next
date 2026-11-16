import { describe, expect, it } from 'vitest';
import type { ChatEvent } from '@/domain/chat';
import { createMessageStore } from './message-store';

const event = (
  id: string,
  createdAt = 1,
  content = 'same',
): Extract<ChatEvent, { type: 'message' }> => ({
  type: 'message',
  message: { id, createdAt, content, senderId: '1', senderName: '合成岛友', revoked: false },
});
describe('inbound idempotency', () => {
  it('never moves a displayed message when subsequent batches have older or equal timestamps', () => {
    const model = createMessageStore();
    model.apply([event('uuid-z', 3000), event('uuid-a', 1000)]);
    model.apply([event('uuid-b', 3000), event('uuid-c', 0)]);
    expect(model.store.getState().ids).toEqual(['uuid-z', 'uuid-a', 'uuid-b', 'uuid-c']);
  });
  it('merges storage-ordered history around overlap without sorting device timestamps', () => {
    const model = createMessageStore();
    model.apply([event('live', 0)]);
    model.apply([event('old', 9000), event('old', 9000), event('live', 0)], null);
    expect(model.store.getState().ids).toEqual(['old', 'live']);
    model.apply([event('new-live', -1000)]);
    model.apply([event('gap', 50000)], 'live');
    expect(model.store.getState().ids).toEqual(['old', 'live', 'gap', 'new-live']);
    model.apply([event('older', 99000)], null);
    expect(model.store.getState().ids).toEqual(['older', 'old', 'live', 'gap', 'new-live']);
  });
  it('keeps a local row at its position after confirmation changes its timestamp', () => {
    const model = createMessageStore();
    const local = {
      ...event('local', 9000).message!,
      clientMessageId: 'command',
      delivery: 'sending' as const,
    };
    model.apply([{ type: 'message', message: local }, event('other', 10000)]);
    model.apply([
      { type: 'message', message: { ...local, id: 'server', createdAt: 0, delivery: undefined } },
    ]);
    model.apply([event('next', -1000)]);
    expect(model.store.getState().ids).toEqual(['local', 'other', 'next']);
    expect(model.store.getState().messages.local).toMatchObject({
      id: 'server',
      createdAt: 0,
      delivery: 'sent',
    });
  });
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
  it('keeps receipt order despite reversed clocks and bounds the window without recent replays', () => {
    const model = createMessageStore();
    model.apply(Array.from({ length: 1200 }, (_, i) => event(String(i), 1200 - i)));
    expect(model.store.getState().ids).toHaveLength(1000);
    expect(model.store.getState().ids[0]).toBe('200');
    model.apply([event('0', 1200)]);
    expect(model.store.getState().messages['0']).toBeUndefined();
    model.reset();
    model.apply([event('1199', 1)]);
    expect(model.store.getState().ids).toEqual(['1199']);
  });
});
