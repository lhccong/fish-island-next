import { afterEach, expect, it, vi } from 'vitest';
import { createLuckyBagClient, decodeLuckyBag, decodeLuckyBagRecords } from './lucky-bag';

const bag = {
  id: 'lb_synthetic',
  name: '合成福袋',
  type: 1,
  status: 0,
  joined: false,
  totalAmount: 50,
  winnerCount: 5,
  participantCount: 0,
  drawTime: '2030-01-01T00:00:00Z',
};
const input = {
  name: '合成福袋',
  type: 1 as const,
  totalAmount: 50,
  winnerCount: 5,
  durationSeconds: 180,
};
afterEach(() => vi.unstubAllGlobals());
function client() {
  return createLuckyBagClient(
    'https://synthetic.test',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    vi.fn(),
  );
}
it('decodes the backend drawn status, safe timestamps, deduplication and sorted winners', () => {
  expect(decodeLuckyBag({ ...bag, status: 1 }).status).toBe(1);
  expect(() => decodeLuckyBag({ ...bag, status: 3 })).toThrow();
  expect(() => decodeLuckyBag({ ...bag, drawTime: 'bad' })).toThrow();
  expect(
    decodeLuckyBagRecords([
      { id: 'a', userName: '甲', amount: 1 },
      { id: 'b', amount: 5 },
      { id: 'a', amount: 2 },
    ]).map((record) => record.amount),
  ).toEqual([5, 2]);
});
it('creates once using the original JSON contract and accepts a stored entity with no joined flag', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: { ...bag, joined: null } })));
  vi.stubGlobal('fetch', fetch);
  expect((await client().create(input, new AbortController().signal)).id).toBe(bag.id);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]![0]).toBe('https://synthetic.test/api/luckybag/create');
  expect(JSON.parse(fetch.mock.calls[0]![1].body as string)).toEqual(input);
});
it('separates business rejection from unconfirmed writes and validates join confirmation', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 50001, message: '积分不足' })))
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: false })));
  vi.stubGlobal('fetch', fetch);
  await expect(client().create(input, new AbortController().signal)).rejects.toMatchObject({
    kind: 'rejected',
  });
  await expect(client().create(input, new AbortController().signal)).rejects.toMatchObject({
    kind: 'uncertain',
  });
  await expect(client().join(bag.id, new AbortController().signal)).rejects.toThrow('参与未确认');
  expect(fetch.mock.calls[2]![0]).toContain('/api/luckybag/join?luckyBagId=lb_synthetic');
  expect(fetch.mock.calls[2]![1].method).toBe('POST');
});
it('expires sessions on backend authentication failure', async () => {
  const expired = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 40100 }))));
  const port = createLuckyBagClient('', () => ({ name: 'synthetic', value: 'synthetic' }), expired);
  await expect(port.active(new AbortController().signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
});
