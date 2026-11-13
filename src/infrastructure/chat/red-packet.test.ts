import { afterEach, expect, it, vi } from 'vitest';
import { createRedPacketClient, decodeRedPacket, decodeRedPacketRecords } from './red-packet';
import { RedPacketCreateError } from '@/domain/chat';

afterEach(() => vi.unstubAllGlobals());
it('creates through authenticated JSON and omits an ordinary packet answer', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: 'rpc_synthetic' })));
  vi.stubGlobal('fetch', fetch);
  const client = createRedPacketClient(
    'https://synthetic.test/',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    vi.fn(),
  );
  expect(
    await client.create(
      { type: 1, totalAmount: 10, count: 1, name: '合成祝福', answer: 'not sent' },
      new AbortController().signal,
    ),
  ).toBe('rpc_synthetic');
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('https://synthetic.test/api/redpacket/create');
  expect(init.method).toBe('POST');
  expect(init.headers['synthetic-session']).toBe('synthetic-value');
  expect(JSON.parse(init.body)).toEqual({ type: 1, totalAmount: 10, count: 1, name: '合成祝福' });
});
it('distinguishes rejected creation from uncertain responses without retrying', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 50001, message: '积分不足' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: '<invalid>' })))
    .mockRejectedValueOnce(new TypeError('synthetic network error'));
  vi.stubGlobal('fetch', fetch);
  const client = createRedPacketClient(
    '',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    vi.fn(),
  );
  const input = { type: 3 as const, totalAmount: 10, count: 1, name: '合成题目', answer: '鱼' };
  const signal = new AbortController().signal;
  await expect(client.create(input, signal)).rejects.toMatchObject({
    kind: 'rejected',
    message: '积分不足',
  });
  await expect(client.create(input, signal)).rejects.toMatchObject({ kind: 'uncertain' });
  await expect(client.create(input, signal)).rejects.toBeInstanceOf(RedPacketCreateError);
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('validates detail and records, deduplicates IDs and sorts by points', () => {
  expect(
    decodeRedPacket({
      type: 3,
      status: 0,
      remainingCount: 2,
      name: '合成题目',
      answer: 'never expose',
    }),
  ).toEqual({ type: 3, status: 0, remainingCount: 2, name: '合成题目' });
  for (const invalid of [
    null,
    {},
    { type: 4, status: 0, remainingCount: 1 },
    { type: 1, status: 0, remainingCount: -1 },
    { type: '1', status: 0, remainingCount: 1 },
  ])
    expect(() => decodeRedPacket(invalid)).toThrow();
  expect(
    decodeRedPacketRecords([
      { id: 'a', amount: 1 },
      { id: 'b', amount: 10, userName: '合成用户', grabTime: 'invalid' },
      { id: 'a', amount: 2 },
    ]),
  ).toEqual([
    { id: 'b', amount: 10, userName: '合成用户', userAvatar: null, grabTime: null },
    { id: 'a', amount: 2, userName: '岛友', userAvatar: null, grabTime: null },
  ]);
  expect(() => decodeRedPacketRecords([{ id: 'a', amount: '4' }])).toThrow();
});

it('uses authenticated POST query parameters and keeps zero-point success', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: 0 })));
  vi.stubGlobal('fetch', fetch);
  const client = createRedPacketClient(
    'https://synthetic.test/',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    vi.fn(),
  );
  expect(await client.grab('rpc_synthetic', '鱼 & 岛', new AbortController().signal)).toBe(0);
  const [url, init] = fetch.mock.calls[0]!;
  expect(new URL(url as string).searchParams.get('answer')).toBe('鱼 & 岛');
  expect(new URL(url as string).pathname).toBe('/api/redpacket/grab');
  expect(init).toMatchObject({
    method: 'POST',
    credentials: 'include',
    headers: { 'synthetic-session': 'synthetic-value' },
  });
  expect(init.body).toBeUndefined();
});

it('handles auth expiry, business errors and uncertain network results without retries', async () => {
  const expired = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 40100 })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 50000, message: '答案错误' })))
    .mockRejectedValueOnce(new TypeError('synthetic network failure'));
  vi.stubGlobal('fetch', fetch);
  const client = createRedPacketClient(
    '',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    expired,
  );
  const signal = new AbortController().signal;
  await expect(client.detail('rpc1', signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
  await expect(client.grab('rpc1', 'wrong', signal)).rejects.toThrow('答案错误');
  await expect(client.grab('rpc1', '', signal)).rejects.toThrow('领取结果未确认');
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('keeps valid record avatars and falls back for unsafe URLs or blank names', () => {
  const records = decodeRedPacketRecords([
    { id: 'a', amount: 4, userAvatar: 'https://image.test/avatar.png' },
    { id: 'b', amount: 3, userAvatar: 'javascript:alert(1)', userName: '  ' },
    { id: 'c', amount: 2, userAvatar: 'invalid' },
  ]);
  expect(records[0]?.userAvatar).toBe('https://image.test/avatar.png');
  expect(records[1]).toMatchObject({ userAvatar: null, userName: '岛友' });
  expect(records[2]?.userAvatar).toBeNull();
});
