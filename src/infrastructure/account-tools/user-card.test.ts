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
