import { afterEach, expect, it, vi } from 'vitest';
import { createChatEmoticons } from './emoticons';

afterEach(() => vi.unstubAllGlobals());
const credential = () => ({ name: 'synthetic-session', value: 'synthetic-value' });
it('preserves the legacy raw URL body, string delete id, page protocol and true-only success', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ code: 0, data: true }))
    .mockResolvedValueOnce(Response.json({ code: 0, data: false }))
    .mockResolvedValueOnce(
      Response.json({
        code: 0,
        data: {
          records: [{ id: '1234567890123456789', emoticonSrc: 'https://image.test/a.gif' }],
          total: 1,
        },
      }),
    );
  vi.stubGlobal('fetch', fetch);
  const port = createChatEmoticons('https://api.test/', credential, vi.fn());
  const signal = new AbortController().signal;
  await port.add('https://image.test/a.gif', signal);
  expect(fetch.mock.calls[0]).toEqual([
    'https://api.test/api/emoticon_favour/add',
    expect.objectContaining({
      body: 'https://image.test/a.gif',
      headers: expect.objectContaining({ 'synthetic-session': 'synthetic-value' }),
    }),
  ]);
  await expect(port.remove('1234567890123456789', signal)).rejects.toThrow('移除失败');
  expect(fetch.mock.calls[1]![1].body).toBe('{"id":"1234567890123456789"}');
  expect(await port.list(2, signal)).toEqual({
    items: [{ id: '1234567890123456789', url: 'https://image.test/a.gif' }],
    total: 1,
  });
  expect(JSON.parse(fetch.mock.calls[2]![1].body as string)).toEqual({ current: 2, pageSize: 24 });
  await expect(port.add('javascript:alert(1)', signal)).rejects.toThrow('图片地址无效');
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('isolates search credentials, rejects unsafe images and deduplicates search results', async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      data: [
        { thumbURL: 'https://image.test/thumb.gif', middleURL: 'https://image.test/a.gif' },
        { thumbURL: 'https://image.test/thumb.gif', middleURL: 'https://image.test/a.gif' },
        { thumbURL: 'data:image/png;base64,ABC' },
        {},
      ],
    }),
  );
  vi.stubGlobal('fetch', fetch);
  const result = await createChatEmoticons('', credential, vi.fn()).search(
    '开心 & 鱼',
    2,
    new AbortController().signal,
  );
  expect(result).toEqual({
    items: [{ id: 'https://image.test/a.gif', url: 'https://image.test/a.gif' }],
    total: 31,
  });
  expect(fetch.mock.calls[0]![1]).toMatchObject({
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  expect(fetch.mock.calls[0]![1].headers).toBeUndefined();
  const url = new URL(fetch.mock.calls[0]![0] as string, 'https://app.test');
  expect(url.pathname).toBe('/emoticon-search');
  expect(url.searchParams.get('word')).toBe('开心 & 鱼表情');
  expect(url.searchParams.get('queryWord')).toBe('开心 & 鱼表情');
  expect(url.searchParams.get('pn')).toBe('30');
  expect(url.searchParams.get('rn')).toBe('30');
});
it('expires auth and rejects malformed collections', async () => {
  const expired = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ code: 40100 }))
      .mockResolvedValueOnce(Response.json({ code: 0, data: { records: [], total: 'invalid' } })),
  );
  const port = createChatEmoticons('', credential, expired);
  await expect(port.list(1, new AbortController().signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
  await expect(port.list(1, new AbortController().signal)).rejects.toThrow('收藏列表异常');
});

it.each([0, 25, '0', '25', '9007199254740991'])(
  'accepts safe numeric and backend Long-string totals: %s',
  async (total) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          code: 0,
          data: {
            records: [{ id: '1234567890123456789', emoticonSrc: 'https://image.test/a.gif' }],
            total,
          },
        }),
      ),
    );
    const port = createChatEmoticons('', credential, vi.fn());
    await expect(port.list(1, new AbortController().signal)).resolves.toEqual({
      items: [{ id: '1234567890123456789', url: 'https://image.test/a.gif' }],
      total: Number(total),
    });
  },
);

it.each([null, undefined, '', ' ', '1.5', '1e2', '-1', '9007199254740992', -1, 1.5, true, {}])(
  'rejects malformed or unsafe totals instead of coercing to an empty list: %j',
  async (total) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ code: 0, data: { records: [], total } })),
    );
    await expect(
      createChatEmoticons('', credential, vi.fn()).list(1, new AbortController().signal),
    ).rejects.toThrow('收藏列表异常');
  },
);
