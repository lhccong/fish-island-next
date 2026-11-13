import { afterEach, expect, it, vi } from 'vitest';
import { createChatRemarks, decodeRemarks } from './remarks';

afterEach(() => vi.unstubAllGlobals());
it('decodes legacy content without losing large string ids and rejects corrupt maps', () => {
  expect(decodeRemarks(null)).toEqual({});
  expect(decodeRemarks({ content: '{"179453000000000001":"测试备注"}' })).toEqual({
    '179453000000000001': '测试备注',
  });
  for (const content of ['[]', 'null', '{', '{"456":12}'])
    expect(() => decodeRemarks({ content })).toThrow('备注数据格式异常');
  expect(() => decodeRemarks({})).toThrow('备注数据格式异常');
});
it('uses authenticated legacy GET/POST and requires confirmed true', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ code: 0, data: null }))
    .mockResolvedValueOnce(Response.json({ code: 0, data: true }))
    .mockResolvedValueOnce(Response.json({ code: 0, data: false }));
  vi.stubGlobal('fetch', fetch);
  const port = createChatRemarks(
    'https://api.test/',
    () => ({ name: 'synthetic', value: 'fixture' }),
    vi.fn(),
  );
  const signal = new AbortController().signal;
  expect(await port.load(signal)).toEqual({});
  await port.save({ '456': '测试备注' }, signal);
  expect(fetch.mock.calls[0]).toEqual([
    'https://api.test/api/userRemark/get',
    expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      headers: expect.objectContaining({ synthetic: 'fixture' }),
    }),
  ]);
  expect(fetch.mock.calls[1]).toEqual([
    'https://api.test/api/userRemark/save',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ content: '{"456":"测试备注"}' }),
    }),
  ]);
  await expect(port.save({}, signal)).rejects.toThrow('备注保存失败');
});
it.each([true, false])('expires HTTP and business authentication failures: %s', async (http) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ code: 40100 }, { status: http ? 401 : 200 })),
  );
  const expired = vi.fn();
  const port = createChatRemarks('', () => ({ name: 'synthetic', value: 'fixture' }), expired);
  await expect(port.load(new AbortController().signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
});
