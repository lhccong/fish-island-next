import { describe, expect, it, vi } from 'vitest';
import { createChatClient, decodeOnlineMembers } from './client';

describe('online members adapter', () => {
  it('maps and deduplicates stable IDs and rejects unsafe data', () => {
    expect(
      decodeOnlineMembers([
        { id: '100', name: '岛友', avatar: 'javascript:bad' },
        { id: '100', name: '岛友更新', avatar: 'https://example.test/avatar.png' },
        { id: 2, name: ' ', avatar: null },
      ]),
    ).toEqual([
      { id: '100', name: '岛友更新', avatar: 'https://example.test/avatar.png' },
      { id: '2', name: '未命名岛友', avatar: null },
    ]);
    for (const data of [null, {}, [{ name: '无标识' }], [{ id: Number.MAX_SAFE_INTEGER + 1 }]])
      expect(() => decodeOnlineMembers(data)).toThrow('数据格式异常');
  });
  it('passes credentials and cancellation and handles expiry and invalid payloads', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const expired = vi.fn();
    const service = createChatClient(
      'https://example.test/',
      () => ({ name: 'test-session', value: 'synthetic' }),
      expired,
    );
    const controller = new AbortController();
    try {
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: [] })));
      await expect(service.loadOnlineMembers(controller.signal)).resolves.toEqual([]);
      expect(fetcher).toHaveBeenCalledWith(
        'https://example.test/api/chat/online/user',
        expect.objectContaining({
          headers: { 'test-session': 'synthetic' },
          cache: 'no-store',
          credentials: 'include',
          signal: expect.any(AbortSignal),
        }),
      );
      for (const response of [
        new Response('', { status: 401 }),
        new Response(JSON.stringify({ code: 40100 })),
      ]) {
        fetcher.mockResolvedValueOnce(response);
        await expect(service.loadOnlineMembers(controller.signal)).rejects.toThrow('登录已过期');
      }
      expect(expired).toHaveBeenCalledTimes(2);
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: {} })));
      await expect(service.loadOnlineMembers(controller.signal)).rejects.toThrow('数据格式异常');
      fetcher.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(service.loadOnlineMembers(controller.signal)).rejects.toThrow('检查网络');
      controller.abort();
      fetcher.mockRejectedValueOnce(controller.signal.reason);
      await expect(service.loadOnlineMembers(controller.signal)).rejects.toBe(
        controller.signal.reason,
      );
    } finally {
      fetcher.mockRestore();
    }
  });
});
