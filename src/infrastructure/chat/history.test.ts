import { afterEach, expect, it, vi } from 'vitest';
import { createChatHistory, decodeHistory } from './history';

const record = (id: string) => ({
  messageWrapper: {
    message: {
      id,
      content: '合成历史',
      sender: { id: 'u', name: '合成', avatar: 'https://example.test/a.png' },
      timestamp: 1,
    },
  },
});
afterEach(() => vi.unstubAllGlobals());
it('decodes legacy wrappers, preserves long IDs and rejects malformed history', () => {
  expect(decodeHistory({ records: [record('9007199254740993')] }, 1)).toMatchObject({
    nextCursor: '9007199254740993',
    messages: [{ id: '9007199254740993', senderAvatar: 'https://example.test/a.png' }],
  });
  expect(decodeHistory({ records: [] }, 50).nextCursor).toBeNull();
  for (const payload of [[], { records: [{}] }, { records: [record('1'), record('2')] }])
    expect(() => decodeHistory(payload, 1)).toThrow();
});
it('sends authenticated initial/cursor requests and forwards cancellation', async () => {
  const fetcher = vi.fn(
    async () => new Response(JSON.stringify({ code: 0, data: { records: [] } })),
  );
  vi.stubGlobal('fetch', fetcher);
  const client = createChatHistory(
    'https://example.test',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    vi.fn(),
  );
  const input = { conversationId: 'public', limit: 50, signal: new AbortController().signal };
  await client.loadHistory({ ...input, cursor: null });
  await client.loadHistory({ ...input, cursor: '9007199254740993' });
  const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
  expect(calls[0]?.[0]).toBe('https://example.test/api/chat/message/page/vo');
  expect(JSON.parse(String(calls[0]?.[1].body))).toEqual({
    roomId: -1,
    pageSize: 50,
    current: 1,
    sortField: 'createTime',
    sortOrder: 'desc',
  });
  expect(JSON.parse(String(calls[1]?.[1].body)).messageId).toBe('9007199254740993');
  expect(calls[0]?.[1].headers).toMatchObject({ 'synthetic-session': 'synthetic-value' });
  expect(calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
});
it('uses a lucky bag UUID at the page boundary unchanged as the next request cursor', async () => {
  const uuid = 'a01b23456789cdef0123456789abcdef';
  const luckyBag = record(uuid);
  luckyBag.messageWrapper.message.content = '福袋已开奖，合成中奖记录';
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: { records: [luckyBag] } })))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 0, data: { records: [record('123')] } })),
    );
  vi.stubGlobal('fetch', fetcher);
  const client = createChatHistory(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic' }),
    vi.fn(),
  );
  const first = await client.loadHistory({ conversationId: 'public', limit: 1, cursor: null });
  expect(first.nextCursor).toBe(uuid);
  const older = await client.loadHistory({
    conversationId: 'public',
    limit: 1,
    cursor: first.nextCursor,
  });
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1].body)).messageId).toBe(uuid);
  expect(older.messages[0]?.id).toBe('123');
});
it('expires unauthorized sessions and rejects HTTP or application failures', async () => {
  const expired = vi.fn();
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const client = createChatHistory(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic' }),
    expired,
  );
  const input = { conversationId: 'public', cursor: null, limit: 50 };
  fetcher.mockResolvedValueOnce(new Response('', { status: 401 }));
  await expect(client.loadHistory(input)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
  fetcher.mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(client.loadHistory(input)).rejects.toThrow('加载失败');
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 1, data: {} })));
  await expect(client.loadHistory(input)).rejects.toThrow('加载失败');
});
