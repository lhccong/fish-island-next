import { afterEach, expect, it, vi } from 'vitest';
import { createChatSender } from './send';
const input = {
  content: '合成正文',
  clientMessageId: 'synthetic-client-id',
  quotedMessageId: '12',
};
afterEach(() => vi.unstubAllGlobals());
it('posts only the command, authenticates, and decodes the canonical quote', async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        code: 0,
        data: {
          message: {
            id: '13',
            content: '合成正文',
            clientMessageId: input.clientMessageId,
            timestamp: 1794530000000,
            sender: { id: '123', name: '服务端昵称' },
            quotedMessage: { id: '12', content: '原文', sender: { name: '岛友' } },
          },
        },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  const sender = createChatSender(
    'https://synthetic.test/',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    vi.fn(),
  );
  expect(await sender.send(input, new AbortController().signal)).toMatchObject({
    id: '13',
    quote: { id: '12', content: '原文' },
  });
  expect(fetch.mock.calls[0]?.[0]).toBe('https://synthetic.test/api/chat/message/send');
  expect(JSON.parse(fetch.mock.calls[0]?.[1].body as string)).toEqual(input);
});
it('rejects expired credentials and mismatched receipts', async () => {
  const expired = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 40100 })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            message: {
              id: '13',
              clientMessageId: 'other',
              content: 'text',
              sender: { id: '123' },
              timestamp: 1794530000000,
            },
          },
        }),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  const sender = createChatSender(
    '',
    () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
    expired,
  );
  await expect(sender.send(input, new AbortController().signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
  await expect(sender.send(input, new AbortController().signal)).rejects.toThrow('发送结果异常');
});
