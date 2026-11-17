import { expect, it, vi } from 'vitest';
import type { ReceivedMessage, SendMessageInput } from '@/domain/chat';
import { createSendController } from './send-controller';
import { createMessageStore } from './message-store';
import { projectRepetitions } from './repetition';

it('sends only a target, prevents duplicate pending pokes, retries and merges canonical snapshots', async () => {
  const model = createMessageStore();
  let resolve!: (message: ReceivedMessage) => void;
  let reject!: (error: Error) => void;
  const send = vi.fn((input: SendMessageInput) => {
    void input;
    return new Promise<ReceivedMessage>((a, b) => {
      resolve = a;
      reject = b;
    });
  });
  const sender = createSendController({ send }, model);
  const user = { id: '123', name: '合成本人', avatarUrl: null, role: 'user' };
  expect(sender.poke('456', '合成目标', user)).toBe(true);
  expect(sender.poke('456', '合成目标', user)).toBe(false);
  const key = model.store.getState().ids[0]!;
  const input = send.mock.calls[0]![0];
  expect(input).toMatchObject({ content: '', pokeTargetId: '456' });
  expect(input.quotedMessageId).toBeUndefined();
  reject(new Error('合成失败'));
  await Promise.resolve();
  expect(model.store.getState().messages[key]?.delivery).toBe('failed');
  sender.retry(key);
  sender.retry(key);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1]![0]).toEqual(input);
  const canonical = {
    ...model.store.getState().messages[key]!,
    id: '999',
    content: '合成本人拍了拍「合成目标」嗷嗷',
    poke: { targetId: '456', targetName: '合成目标', suffix: '嗷嗷' },
  };
  model.apply([{ type: 'message', message: canonical }]);
  resolve(canonical);
  await Promise.resolve();
  expect(model.store.getState().ids).toEqual([key]);
  expect(model.store.getState().messages[key]).toMatchObject({
    delivery: 'sent',
    poke: canonical.poke,
  });
  model.apply([{ type: 'revoke', id: '999' }]);
  expect(model.store.getState().messages[key]?.revoked).toBe(true);
});

it('never combines repeated poke notices', () => {
  const messages = Object.fromEntries(
    ['1', '2', '3'].map((id) => [
      id,
      {
        id,
        content: 'same',
        senderId: '123',
        senderName: '合成',
        createdAt: 1,
        revoked: false,
        poke: { targetId: '456', targetName: '合成', suffix: '' },
      },
    ]),
  );
  expect(projectRepetitions(['1', '2', '3'], messages).visibleIds).toEqual(['1', '2', '3']);
});
