import { afterEach, expect, it, vi } from 'vitest';
import { createChatReport } from './report';

afterEach(() => vi.unstubAllGlobals());
const client = (expired = vi.fn()) =>
  createChatReport('https://report.test', () => ({ name: 'synthetic', value: 'fixture' }), expired);
it('loads validated reasons and preserves long IDs in the report protocol', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ code: 0, data: [{ value: 1, text: '原因' }] }))
    .mockResolvedValueOnce(Response.json({ code: 0, data: '9007199254740993' }));
  vi.stubGlobal('fetch', fetcher);
  const port = client();
  expect(await port.reasons(new AbortController().signal)).toEqual([{ value: 1, text: '原因' }]);
  const input = {
    targetId: '9007199254740993',
    targetUserId: '9007199254740995',
    reasonType: 1,
    description: '合成说明',
  };
  await port.submit(input, new AbortController().signal);
  expect(JSON.parse(fetcher.mock.calls[1]![1].body as string)).toEqual({ ...input, reportType: 1 });
});
it('rejects malformed reasons, unconfirmed submissions and expired authentication', async () => {
  const expired = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ code: 0, data: [{ value: '1', text: '原因' }] }))
      .mockResolvedValueOnce(Response.json({ code: 0, data: null }))
      .mockResolvedValueOnce(new Response('', { status: 401 })),
  );
  const port = client(expired);
  await expect(port.reasons(new AbortController().signal)).rejects.toThrow('格式异常');
  await expect(
    port.submit(
      { targetId: '1', targetUserId: '2', reasonType: 1, description: '' },
      new AbortController().signal,
    ),
  ).rejects.toThrow('未收到举报确认');
  await expect(port.reasons(new AbortController().signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
});
