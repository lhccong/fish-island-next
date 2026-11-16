import { expect, test, vi } from 'vitest';
import { createBroadcastChannel, decodeBroadcast } from './index';

const data = { id: 'synthetic-1', content: '<b>纯文字播报</b>', publishedAt: 1794800000000 };
const frame = (value: unknown) => JSON.stringify({ type: 'broadcast', data: value });
test('only accepts bounded valid broadcast frames and preserves plain text', () => {
  expect(decodeBroadcast(frame(data))).toEqual(data);
  for (const invalid of [
    null,
    {},
    '{',
    'x'.repeat(5000),
    JSON.stringify({ type: 'chat', data }),
    frame({ ...data, id: {} }),
    frame({ ...data, content: ' '.repeat(200) }),
    frame({ ...data, content: 'x'.repeat(201) }),
    frame({ ...data, content: '\u0000bad' }),
    frame({ ...data, publishedAt: '123' }),
    frame({ ...data, publishedAt: 1.5 }),
  ]) {
    expect(decodeBroadcast(invalid)).toBeNull();
  }
});
test('fans out only validated frames and releases subscribers', () => {
  const channel = createBroadcastChannel();
  const first = vi.fn();
  const second = vi.fn();
  const stop = channel.subscribe(first);
  channel.subscribe(second);
  channel.receive(frame(data));
  stop();
  channel.receive(frame(data));
  channel.receive('invalid');
  expect(first).toHaveBeenCalledExactlyOnceWith(data);
  expect(second).toHaveBeenCalledTimes(2);
});
