import { describe, expect, it, vi } from 'vitest';
import { createChatClient, decodeOnlineMembers } from './client';

describe('online members adapter', () => {
  it('preserves valid optional levels without inventing missing or malformed values', () => {
    const members = decodeOnlineMembers([
      { id: 'one', name: '合成', level: 7 },
      { id: 'two', name: '合成', level: 0 },
      { id: 'three', name: '合成', level: '7' },
      { id: 'four', name: '合成', level: -1 },
      { id: 'five', name: '合成', level: 1.5 },
      { id: 'six', name: '合成' },
    ]);
    expect(members.map((member) => member.level)).toEqual([
      7,
      0,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
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

  it('keeps the title snapshot available to cards opened from the member list', () => {
    expect(
      decodeOnlineMembers([{ id: '1', name: '合成岛友', titleId: '7', titleIdList: '["7",2,2]' }]),
    ).toMatchObject([{ id: '1', titleId: '7', titleIds: ['7', '2'] }]);
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
