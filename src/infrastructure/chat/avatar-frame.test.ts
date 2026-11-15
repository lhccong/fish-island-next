import { expect, it } from 'vitest';
import { decodeReceivedMessage } from './protocol';
import { decodeHistory } from './history';
import { decodeOnlineMembers } from './client';

it('keeps frame snapshots in history and realtime without extra profile requests', () => {
  const message = {
    id: 'frame-message',
    sender: { id: 'synthetic', name: '岛友', avatarFramerUrl: 'https://frame.test/a.png' },
    content: '合成消息',
    timestamp: 1000,
  };
  expect(decodeReceivedMessage(message)?.senderAvatarFrame).toBe('https://frame.test/a.png');
  expect(
    decodeHistory({ records: [{ messageWrapper: { message } }] }, 50).messages[0]
      ?.senderAvatarFrame,
  ).toBe('https://frame.test/a.png');
  expect(
    decodeOnlineMembers([{ id: 'synthetic', avatarFramerUrl: 'https://frame.test/a.png' }])[0]
      ?.avatarFrameUrl,
  ).toBe('https://frame.test/a.png');
  expect(
    decodeReceivedMessage({
      ...message,
      sender: { id: 'synthetic', avatarFramerUrl: 'javascript:bad' },
    })?.senderAvatarFrame,
  ).toBeUndefined();
});
