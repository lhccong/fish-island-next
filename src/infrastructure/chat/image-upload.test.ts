import { afterEach, expect, it, vi } from 'vitest';
import { createChatImageUpload } from './image-upload';

afterEach(() => vi.unstubAllGlobals());
it('reports readable errors for unavailable or malformed upload responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('<html>invalid response</html>')),
  );
  const port = createChatImageUpload('', () => ({ name: 'synthetic', value: 'test' }), vi.fn());
  await expect(
    port.upload(new File(['x'], 'image.png'), new AbortController().signal),
  ).rejects.toThrow('图片上传失败，请重试');
  await expect(
    port.upload(new File(['x'], 'image.png'), new AbortController().signal),
  ).rejects.toThrow('图片上传结果异常，请重试');
});
it('uploads multipart using the legacy business and authenticated header', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: 'https://image.test/a.png' })));
  vi.stubGlobal('fetch', fetcher);
  const port = createChatImageUpload(
    'https://api.test/',
    () => ({ name: 'synthetic', value: 'test' }),
    vi.fn(),
  );
  expect(await port.upload(new File(['image'], 'paste.png'), new AbortController().signal)).toBe(
    'https://image.test/a.png',
  );
  const [url, init] = fetcher.mock.calls[0]! as [string, RequestInit];
  expect(url).toBe('https://api.test/api/file/minio/upload?biz=user_file');
  expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  expect(new Headers(init.headers).get('synthetic')).toBe('test');
  expect(new Headers(init.headers).has('content-type')).toBe(false);
});
it('rejects invalid addresses and reports expired authentication', async () => {
  const expired = vi.fn();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: 'javascript:alert(1)' })))
    .mockResolvedValueOnce(new Response('', { status: 401 }));
  vi.stubGlobal('fetch', fetcher);
  const port = createChatImageUpload('', () => ({ name: 'synthetic', value: 'test' }), expired);
  await expect(
    port.upload(new File(['x'], 'paste.png'), new AbortController().signal),
  ).rejects.toThrow('图片地址无效');
  await expect(
    port.upload(new File(['x'], 'paste.png'), new AbortController().signal),
  ).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
});
