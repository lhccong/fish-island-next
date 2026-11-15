import { afterEach, expect, it, vi } from 'vitest';
import { createAuthClient } from './client';
import { decodeUser } from './decode';

const token = { name: 'synthetic-session', value: 'synthetic-value' };
const signal = new AbortController().signal;
afterEach(() => vi.unstubAllGlobals());

it('maps legacy frame pagination, ownership, IDs and query mutations', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            records: [
              {
                id: '9007199254740993',
                name: '海风',
                url: 'https://frame.test/a.png',
                points: 100,
                hasOwned: false,
              },
            ],
            total: 25,
          },
        }),
      ),
    )
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 0, data: true }))),
    );
  vi.stubGlobal('fetch', fetcher);
  const client = createAuthClient('https://example.test/');
  expect(await client.avatarFrames(2, token, signal)).toEqual({
    items: [
      {
        id: '9007199254740993',
        name: '海风',
        url: 'https://frame.test/a.png',
        points: 100,
        owned: false,
      },
    ],
    total: 25,
  });
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.test/api/api/avatar/frame/list/page/vo');
  expect(JSON.parse(fetcher.mock.calls[0]?.[1].body as string)).toEqual({
    current: 2,
    pageSize: 12,
  });
  await client.exchangeAvatarFrame('9007199254740993', token, signal);
  await client.setAvatarFrame('-1', token, signal);
  expect(fetcher.mock.calls[1]?.[0]).toContain('/exchange?frameId=9007199254740993');
  expect(fetcher.mock.calls[2]?.[0]).toContain('/set?frameId=-1');
  expect(fetcher.mock.calls[1]?.[1].headers.get(token.name)).toBe(token.value);
  await expect(client.exchangeAvatarFrame('-1', token, signal)).rejects.toThrow('有效');
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('rejects unconfirmed mutations and invalid catalog records; discards executable images', async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 0, data: false }))),
    );
  vi.stubGlobal('fetch', fetcher);
  const client = createAuthClient('https://example.test');
  await expect(client.setAvatarFrame('1', token, signal)).rejects.toThrow('未确认');
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ code: 0, data: { records: [{ id: 1, points: -1 }], total: 1 } })),
  );
  await expect(client.avatarFrames(1, token, signal)).rejects.toThrow('不完整');
  expect(
    decodeUser({ id: 'synthetic', avatarFramerUrl: 'javascript:bad', points: 200, usedPoints: 50 }),
  ).toMatchObject({ avatarFrameUrl: '', points: 200, usedPoints: 50 });
});
