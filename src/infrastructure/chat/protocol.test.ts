import { expect, it } from 'vitest';
import { decodeChatEvent } from './protocol';

it('decodes a safe sender avatar and drops unsafe avatar URLs', () => {
  const frame = (avatar: string) =>
    JSON.stringify({
      type: 'chat',
      data: {
        message: {
          id: 'a',
          sender: { id: 'b', name: '合成', avatar },
          content: '合成',
          timestamp: 1,
        },
      },
    });
  expect(decodeChatEvent(frame('https://images.test/avatar.png'))).toMatchObject({
    message: { senderAvatar: 'https://images.test/avatar.png' },
  });
  expect(decodeChatEvent(frame('javascript:alert(1)'))).toMatchObject({
    message: { senderAvatar: null },
  });
});

it('validates unknown envelopes and normalizes safe IDs without parsing HTML', () => {
  const frame = {
    type: 'chat',
    data: {
      message: {
        id: 1,
        sender: { id: '2', name: '合成用户' },
        timestamp: '2026-11-12T00:00:00Z',
        content: '<img onerror=alert(1)>',
      },
    },
  };
  expect(decodeChatEvent(JSON.stringify(frame))).toMatchObject({
    type: 'message',
    message: { id: '1', content: '<img onerror=alert(1)>' },
  });
  expect(decodeChatEvent(JSON.stringify({ type: 'userMessageRevoke', data: 1 }))).toEqual({
    type: 'revoke',
    id: '1',
  });
  for (const raw of [
    'bad',
    '{}',
    'null',
    '[]',
    JSON.stringify({ ...frame, type: 'refreshRoom' }),
    JSON.stringify({
      type: 'chat',
      data: { message: { ...frame.data.message, id: Number.MAX_SAFE_INTEGER + 1 } },
    }),
  ]) {
    expect(decodeChatEvent(raw)).toBeNull();
  }
});
