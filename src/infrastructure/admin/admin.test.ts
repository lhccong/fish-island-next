import { afterEach, expect, test, vi } from 'vitest';
import { createAdminClient } from './index';
import { equipment, user } from './decode';
const signal = () => new AbortController().signal;
const token = { name: 'test-session', value: 'synthetic-value' };
afterEach(() => vi.unstubAllGlobals());
test('broadcast publishing uses authenticated admin endpoint and requires server confirmation', async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ code: 0, data: true })),
  );
  vi.stubGlobal('fetch', fetchMock);
  const client = createAdminClient(
    'https://admin.test',
    () => token,
    () => true,
    vi.fn(),
  );
  await client.publishBroadcast('合成播报', signal());
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://admin.test/api/admin/broadcast/publish');
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: 'POST',
    headers: { 'test-session': 'synthetic-value' },
    body: JSON.stringify({ content: '合成播报' }),
  });
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ code: 0, data: false })));
  await expect(client.publishBroadcast('合成播报', signal())).rejects.toThrow('服务器未确认');
});
test('blocks missing credentials and non-admin before network', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  for (const [credential, allowed] of [
    [() => null, () => true],
    [() => token, () => false],
  ] as const) {
    const client = createAdminClient('https://admin.test', credential, allowed, vi.fn());
    await expect(client.list('user', 1, {}, signal())).rejects.toThrow('仅管理员');
    await expect(client.publishBroadcast('合成播报', signal())).rejects.toThrow('仅管理员');
  }
  expect(fetch).not.toHaveBeenCalled();
});
test('keeps system level titles outside manual assignment', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const c = createAdminClient(
    'https://admin.test',
    () => token,
    () => true,
    vi.fn(),
  );
  await expect(c.assignTitle('1', '2', true, signal())).rejects.toThrow('系统等级称号');
  await expect(c.assignTitle('1', '10', false, signal())).rejects.toThrow('系统等级称号');
  expect(fetch).not.toHaveBeenCalled();
});
test('only exposes selected user fields and preserves long IDs', () => {
  expect(
    user({
      id: '9223372036854775807',
      userName: '合成用户',
      userRole: 'user',
      userPassword: 'synthetic-secret-field',
    }),
  ).toEqual({
    id: '9223372036854775807',
    name: '合成用户',
    role: 'user',
    account: '',
    avatar: '',
    profile: '',
    createdAt: '',
    updatedAt: '',
  });
});
test('reports revoked permission for role refresh without treating it as logout', async () => {
  const expired = vi.fn();
  const denied = vi.fn();
  const c = createAdminClient(
    'https://admin.test',
    () => token,
    () => true,
    expired,
    denied,
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ code: 40101, message: '无权限' }))),
  );
  await expect(c.list('title', 1, {}, signal())).rejects.toThrow('无权限');
  expect(denied).toHaveBeenCalledOnce();
  expect(expired).not.toHaveBeenCalled();
});
test('legacy paths, ID fields, query parameters and equipment attributes', async () => {
  const calls: { path: string; body: unknown; method: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      const u = new URL(url);
      calls.push({
        path: u.pathname + u.search,
        body: options.body ? JSON.parse(String(options.body)) : null,
        method: options.method!,
      });
      return new Response(
        JSON.stringify({
          code: 0,
          data: u.pathname.endsWith('/edit')
            ? { id: '8' }
            : u.pathname.endsWith('/add') && u.pathname !== '/api/user/mute/add'
              ? '8'
              : true,
        }),
      );
    }),
  );
  const c = createAdminClient(
    'https://admin.test',
    () => token,
    () => true,
    vi.fn(),
  );
  await c.saveUser(
    { id: '1', name: '合成用户', account: '', avatar: '', profile: '简介', role: 'user' },
    signal(),
  );
  await c.saveTitle({ id: '30', name: '合成称号' }, signal());
  await c.saveTag(
    { id: '', name: '合成标签', color: 'blue', icon: '', sort: 0, type: 0 },
    signal(),
  );
  await c.saveWord({ id: '2', word: '海风', category: 'undercover', wordType: '日常' }, signal());
  await c.saveEquipment(
    equipment({ id: '8', name: '合成剑', mainAttr: { critRate: 0.03, unknownAttribute: 0.07 } }),
    signal(),
  );
  await c.remove('title', '30', signal());
  await c.assignTitle('1', '30', true, signal());
  await c.assignTitle('1', '30', false, signal());
  await c.markScript('1', true, signal());
  await c.handleReport('4', 2, '驳回', signal());
  await c.muteUser('1', 600, signal());
  expect(calls[0]).toMatchObject({
    path: '/api/user/update',
    body: { id: '1', userName: '合成用户', userProfile: '简介', userRole: 'user' },
  });
  expect(calls[1]).toMatchObject({
    path: '/api/user/title/update',
    body: { titleId: '30', name: '合成称号' },
  });
  expect(calls[2]).toMatchObject({ path: '/api/tags/add', body: { tagsName: '合成标签' } });
  expect(calls[3]).toMatchObject({
    path: '/api/word/library/update',
    body: { id: '2', word: '海风' },
  });
  expect(calls[4]).toMatchObject({
    path: '/api/itemTemplates/edit',
    body: { id: '8', mainAttr: { critRate: 0.03, unknownAttribute: 0.07 } },
  });
  expect(calls[5]).toMatchObject({ path: '/api/user/title/delete', body: { id: '30' } });
  expect(calls[6]?.path).toBe('/api/user/title/add/toUser?userId=1&titleId=30');
  expect(calls[7]?.path).toBe('/api/user/title/remove/fromUser?userId=1&titleId=30');
  expect(calls[8]?.path).toBe('/api/redpacket/script/mark?userId=1&mark=true');
  expect(calls[9]).toMatchObject({
    path: '/api/report/admin/handle',
    body: { id: '4', status: 2, handleRemark: '驳回' },
  });
  expect(calls[10]).toMatchObject({
    path: '/api/user/mute/add',
    body: { userId: '1', duration: 600 },
  });
});
test('report uses GET query while admin lists use POST and normalize entities', async () => {
  const fetch = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            records: new URL(url).pathname.startsWith('/api/user/title')
              ? [{ titleId: '30', name: '称号' }]
              : [{ id: '8', reportType: 1, status: 0 }],
            total: 1,
          },
        }),
      ),
  );
  vi.stubGlobal('fetch', fetch);
  const c = createAdminClient(
    'https://admin.test',
    () => token,
    () => true,
    vi.fn(),
  );
  expect((await c.list('title', 2, { name: '称号' }, signal())).items[0]?.id).toBe('30');
  await c.list('report', 3, { status: 0 }, signal());
  expect(fetch.mock.calls[0]?.[0]).toBe('https://admin.test/api/user/title/list/page');
  expect(fetch.mock.calls[1]?.[0]).toBe(
    'https://admin.test/api/report/admin/list?status=0&current=3&pageSize=20',
  );
});
test('rejects unconfirmed mutations and restores expired sessions once', async () => {
  const restore = vi.fn();
  const c = createAdminClient(
    'https://admin.test',
    () => token,
    () => true,
    restore,
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ code: 0, data: false }))),
  );
  await expect(c.remove('user', '1', signal())).rejects.toThrow('未确认');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ code: 40100 }))),
  );
  await expect(c.statistics(signal())).rejects.toThrow('登录已过期');
  expect(restore).toHaveBeenCalledOnce();
});
