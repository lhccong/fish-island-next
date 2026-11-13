import { expect, it, vi } from 'vitest';
import type { ReceivedMessage, SendMessageInput } from '@/domain/chat';
import { createSendController } from './send-controller';
import { createMessageStore } from './message-store';
const user = { id: 'self', name: '合成用户', avatarUrl: null, role: 'user' };
function setup() {
  let resolve!: (m: ReceivedMessage) => void;
  let reject!: (e: Error) => void;
  const send = vi.fn(
    (input: SendMessageInput, signal: AbortSignal) =>
      new Promise<ReceivedMessage>((a, b) => {
        void input;
        void signal;
        resolve = a;
        reject = b;
      }),
  );
  const model = createMessageStore();
  const sender = createSendController({ send }, model);
  sender.send('合成正文', undefined, user);
  const key = model.store.getState().ids[0]!;
  const canonical = () => ({
    ...model.store.getState().messages[key]!,
    id: '1794530000000',
    senderName: '服务端昵称',
    content: '已过滤正文',
    delivery: undefined,
  });
  return {
    model,
    sender,
    send,
    key,
    canonical,
    resolve: (m: ReceivedMessage) => resolve(m),
    reject: () => reject(new TypeError('offline')),
  };
}
it.each(['push-first', 'http-first'])(
  'merges %s with a stable key and keeps HTTP spinner until settled',
  async (order) => {
    const f = setup();
    const message = f.canonical();
    if (order === 'push-first') {
      f.model.apply([{ type: 'message', message }]);
      expect(f.model.store.getState().messages[f.key]?.delivery).toBe('sending');
    }
    f.resolve(message);
    await Promise.resolve();
    f.model.apply([{ type: 'message', message }]);
    expect(f.model.store.getState().ids).toEqual([f.key]);
    expect(f.model.store.getState().messages[f.key]).toMatchObject({
      id: message.id,
      delivery: 'sent',
      senderName: '服务端昵称',
    });
    f.model.apply([
      { type: 'revoke', id: message.id },
      { type: 'message', message },
    ]);
    expect(f.model.store.getState().messages[f.key]).toMatchObject({ revoked: true, content: '' });
  },
);
it('retries once in flight with the same command and resolves a late push after failure', async () => {
  const f = setup();
  f.reject();
  await Promise.resolve();
  expect(f.model.store.getState().messages[f.key]?.delivery).toBe('failed');
  f.sender.retry(f.key);
  f.sender.retry(f.key);
  expect(f.send).toHaveBeenCalledTimes(2);
  expect(f.send.mock.calls[0]?.[0]).toEqual(f.send.mock.calls[1]?.[0]);
  const message = f.canonical();
  f.reject();
  await Promise.resolve();
  f.model.apply([{ type: 'message', message }]);
  expect(f.model.store.getState().messages[f.key]?.delivery).toBe('sent');
});
it('uses a pushed confirmation when HTTP times out, and cancels account work', async () => {
  const f = setup();
  f.model.apply([{ type: 'message', message: f.canonical() }]);
  f.reject();
  await Promise.resolve();
  expect(f.model.store.getState().messages[f.key]?.delivery).toBe('sent');
  f.sender.send('另一条', undefined, user);
  const call = f.send.mock.calls.at(-1)!;
  f.sender.reset();
  f.model.reset();
  f.resolve(f.canonical());
  await Promise.resolve();
  expect(call[1].aborted).toBe(true);
  expect(f.model.store.getState().ids).toEqual([]);
});
it('pins pending and failed messages while evicting confirmed history', () => {
  const f = setup();
  f.model.apply(
    Array.from({ length: 1100 }, (_, i) => ({
      type: 'message' as const,
      message: {
        id: String(i),
        senderId: 'other',
        senderName: '合成',
        content: 'text',
        createdAt: i,
        revoked: false,
      },
    })),
  );
  expect(f.model.store.getState().ids).toHaveLength(1000);
  expect(f.model.store.getState().messages[f.key]?.delivery).toBe('sending');
});
