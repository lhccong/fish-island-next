import { afterEach, expect, it, vi } from 'vitest';
import { createHotBoardClient } from './client';

afterEach(() => vi.unstubAllGlobals());

it('posts publicly without credentials and decodes the response', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: [] })));
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    createHotBoardClient('https://example.com/').load(new AbortController().signal),
  ).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledWith(
    'https://example.com/api/hot/list',
    expect.objectContaining({
      method: 'POST',
      credentials: 'omit',
      signal: expect.any(AbortSignal),
    }),
  );
});

it('surfaces HTTP failures and network errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
  await expect(
    createHotBoardClient('https://example.com').load(new AbortController().signal),
  ).rejects.toThrow('HTTP 503');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(
    createHotBoardClient('https://example.com').load(new AbortController().signal),
  ).rejects.toThrow('网络连接失败');
});
