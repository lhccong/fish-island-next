import { afterEach, expect, it, vi } from 'vitest';
import { createAccountToolsClient } from './client';
import { decodeUserCard } from './user-card';
afterEach(() => vi.unstubAllGlobals());
it('decodes backend Long strings without turning missing, invalid or unsafe counts into zero', () => {
  expect(decodeUserCard({ id: '1', followingCount: '0', followerCount: '15' })).toMatchObject({
    following: 0,
    followers: 15,
  });
  for (const value of ['', ' ', null, '-1', '1.2', '1e3', '9007199254740992', true]) {
    expect(decodeUserCard({ id: '1', followingCount: value, followerCount: value })).toMatchObject({
      following: undefined,
      followers: undefined,
    });
  }
});
it('keeps unavailable profile fields unknown and rejects unsafe image sources', () => {
  expect(decodeUserCard(null)).toBeNull();
  expect(() => decodeUserCard([])).toThrow('格式');
  expect(
    decodeUserCard({
      id: '1',
      userName: '合成',
      userAvatar: 'javascript:bad',
      momentsBgUrl: 'https://example.test/cover',
    }),
  ).toMatchObject({
    id: '1',
    name: '合成',
    avatar: null,
    cover: 'https://example.test/cover',
    following: undefined,
    followers: undefined,
    region: '',
  });
});
it('reads a public MBTI type and treats unknown values as unfilled', () => {
  expect(decodeUserCard({ id: '1', mbti: 'ESTP' })?.mbti).toBe('ESTP');
  expect(decodeUserCard({ id: '1', mbti: 'ESTP-T' })?.mbti).toBe('');
  expect(decodeUserCard({ id: '1' })?.mbti).toBe('');
});
it('reads ordered title IDs from legacy lists and distinguishes an empty list from a missing one', () => {
  expect(
    decodeUserCard({
      id: '1',
      titleId: '2',
      titleIdList: '[4,"4",0,"2","90071992547409921",9007199254740992,null,"wrong"]',
    }),
  ).toMatchObject({ titleId: '2', titleIds: ['4', '2', '90071992547409921'] });
  expect(decodeUserCard({ id: '1', titleId: 0, titleIdList: [] })).toMatchObject({
    titleId: '0',
    titleIds: [],
  });
  expect(decodeUserCard({ id: '1', titleIdList: '[invalid' })?.titleIds).toBeUndefined();
  expect(decodeUserCard({ id: '1' })?.titleIds).toBeUndefined();
});
it('adapts follow and mute protocols and requires server confirmation', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const client = createAccountToolsClient(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic' }),
    vi.fn(),
  );
  const signal = new AbortController().signal;
  const reply = (data: unknown) =>
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data })));
  reply(false);
  expect(await client.followingState('1 &', signal)).toBe(false);
  expect(fetcher.mock.calls[0]?.[0]).toContain('follow/is-following?followUserId=1%20%26');
  reply({ isMuted: true, remainingTime: '1分钟' });
  expect(await client.muteInfo('1', signal)).toEqual({ muted: true, remaining: '1分钟' });
  reply(true);
  await client.mute('1', 600, signal);
  expect(fetcher.mock.calls[2]?.[1]).toMatchObject({
    method: 'POST',
    body: JSON.stringify({ userId: '1', duration: 600 }),
  });
  reply(false);
  await expect(client.mute('1 &', null, signal)).rejects.toThrow('未确认');
  expect(fetcher.mock.calls[3]?.[0]).toContain('user/mute/remove?userId=1%20%26');
});

it('reads the private card stats and falls back only for missing relationship counts', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const client = createAccountToolsClient(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic' }),
    vi.fn(),
  );
  const signal = new AbortController().signal;
  const reply = (data: unknown) =>
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data })));
  const id = '90071992547409921';
  reply({ id, level: 7, points: 220, followingCount: '13', followerCount: '9' });
  expect(await client.card(id, signal)).toMatchObject({
    level: 7,
    points: 220,
    following: 13,
    followers: 9,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.test/api/user/get/login');

  reply({ id, followingCount: '0' });
  reply({ id, followingCount: '13', followerCount: '9' });
  expect(await client.card(id, signal)).toMatchObject({
    level: undefined,
    points: undefined,
    following: 0,
    followers: 9,
  });
  expect(fetcher.mock.calls[2]?.[0]).toContain(`user/get/vo?id=${id}`);
  reply({ id: '2' });
  await expect(client.card(id, signal)).rejects.toThrow('资料不匹配');
});

it('reads follow pages with Long totals and preserves the exact target ID for toggling', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const client = createAccountToolsClient(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic' }),
    vi.fn(),
  );
  const signal = new AbortController().signal;
  const reply = (data: unknown) =>
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data })));
  const id = '90071992547409921';
  const user = { userId: id, userName: '合成岛友', isMutual: false };
  reply({ records: [user, { userId: '2', isMutual: true }], total: '32' });
  expect(await client.follows('followers', 2, signal)).toMatchObject({
    total: 32,
    items: [
      { id, name: '合成岛友', mutual: false },
      { id: '2', mutual: true },
    ],
  });
  expect(fetcher.mock.calls[0]?.[0]).toContain('follow/followers?current=2&pageSize=20');
  reply({ records: [user, { userId: '2', isMutual: true }], total: 2 });
  expect(await client.follows('following', 1, signal)).toMatchObject({
    items: [
      { id, mutual: false },
      { id: '2', mutual: true },
    ],
  });
  reply({ records: [], total: '9007199254740992' });
  await expect(client.follows('followers', 1, signal)).rejects.toThrow('关注列表格式不正确');
  reply(true);
  expect(await client.toggleFollow(id, signal)).toBe(true);
  expect(fetcher.mock.calls[3]?.[0]).toContain(`follow/toggle?followUserId=${id}`);
  reply(false);
  expect(await client.toggleFollow(id, signal)).toBe(false);
});

it('requests another user’s follow pages with their full ID and the dedicated endpoint', async () => {
  const fetcher = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify({ code: 0, data: { total: '0', records: [] } }))),
  );
  vi.stubGlobal('fetch', fetcher);
  const client = createAccountToolsClient(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic' }),
    vi.fn(),
  );
  const signal = new AbortController().signal;
  for (const kind of ['following', 'followers'] as const) {
    expect(await client.follows(kind, 2, signal, '90071992547409921')).toEqual({
      total: 0,
      items: [],
    });
    expect(fetcher).toHaveBeenLastCalledWith(
      `https://example.test/api/follow/user/${kind}?current=2&pageSize=20&userId=90071992547409921`,
      expect.any(Object),
    );
  }
});
