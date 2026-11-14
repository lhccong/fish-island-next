import { afterEach, expect, it, vi } from 'vitest';
import { createFarmClient } from './index';
import { land, friend, farmer, visitor } from './decode';
afterEach(() => vi.unstubAllGlobals());
const signal = new AbortController().signal;
it('保留服务端头像并拒绝脚本和协议相对地址', () => {
  expect(friend({ friendId: '1', avatar: 'https://farm.test/avatar.png' }).avatar).toBe(
    'https://farm.test/avatar.png',
  );
  expect(friend({ friendId: '1', avatar: 'javascript:alert(1)' }).avatar).toBe('');
  expect(farmer({ userAvatar: '//farm.test/avatar.png' }).avatar).toBe('');
  expect(visitor({ id: '1', stealerAvatar: '/assets/avatar.png' }).avatar).toBe(
    '/assets/avatar.png',
  );
});
it('保留长整型地块编号与批量种植旧协议', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: [] })));
  vi.stubGlobal('fetch', fetcher);
  const client = createFarmClient(
    '',
    () => ({ name: 'test-session', value: 'synthetic' }),
    vi.fn(),
  );
  await client.act('plant', ['9007199254740993123'], '3', signal);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url).toBe('/api/land/plant');
  expect(JSON.parse(init.body)).toEqual({
    items: [{ landId: '9007199254740993123', cropId: '3' }],
  });
  expect(land({ id: '9007199254740993123', landIndex: 1 }).id).toBe('9007199254740993123');
  expect(() => land({ id: Number('9007199254740993123'), landIndex: 1 })).toThrow('编号异常');
});
it('批量浇水保留部分失败，鉴权过期通知会话层', async () => {
  const expired = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            data: [{ success: true }, { success: false, message: '冷却中' }],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 401 })),
  );
  const client = createFarmClient(
    '',
    () => ({ name: 'test-session', value: 'synthetic' }),
    expired,
  );
  expect(await client.act('waterBatch', ['1', '2'], null, signal)).toContain('1 块未完成：冷却中');
  await expect(client.farmer(signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
});
