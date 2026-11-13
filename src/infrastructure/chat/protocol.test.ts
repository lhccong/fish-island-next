import { expect, it } from 'vitest';
import { decodeChatEvent, decodeReceivedMessage } from './protocol';

it('normalizes legacy millisecond strings alongside ISO and numeric timestamps', () => {
  const message = { id: 'robot', sender: { id: '-1' }, content: '合成机器人消息' };
  for (const timestamp of [1794441600000, '1794441600000', '2026-11-12T00:00:00Z']) {
    expect(decodeReceivedMessage({ ...message, timestamp })?.createdAt).toBe(1794441600000);
    expect(
      decodeChatEvent(
        JSON.stringify({ type: 'chat', data: { message: { ...message, timestamp } } }),
      ),
    ).toMatchObject({ message: { createdAt: 1794441600000 } });
  }
  for (const timestamp of ['', 'invalid', '99999999999999999999', null]) {
    expect(decodeReceivedMessage({ ...message, timestamp })).toBeNull();
  }
});

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
        sender: { id: '2', name: '合成用户', titleId: 7 },
        timestamp: '2026-11-12T00:00:00Z',
        content: '<img onerror=alert(1)>',
      },
    },
  };
  expect(decodeChatEvent(JSON.stringify(frame))).toMatchObject({
    type: 'message',
    message: { id: '1', senderTitleId: '7', content: '<img onerror=alert(1)>' },
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
