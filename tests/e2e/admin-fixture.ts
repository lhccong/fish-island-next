import { expect, type Page } from '@playwright/test';
export const adminRoutes = [
  ['/admin/data', '数据分析'],
  ['/admin/user', '用户管理'],
  ['/admin/title', '称号管理'],
  ['/admin/tags', '标签管理'],
  ['/admin/word/library', '词库管理'],
  ['/admin/game/itemTemplates', '装备管理'],
  ['/admin/report', '举报管理'],
] as const;
export async function setupAdmin(page: Page, skin = 'wechat', mode = 'light', role = 'admin') {
  const state = {
    role,
    self: false,
    phase: 'success',
    delay: 0,
    mutationFail: false,
    requests: [] as {
      path: string;
      body: Record<string, unknown>;
      query: Record<string, string>;
    }[],
    owned: false,
    total: 1,
    batch: 1,
    duplicate: false,
  };
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      sessionStorage.setItem(
        'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
        JSON.stringify({ name: 'test-session', value: 'synthetic-value' }),
      );
    },
    { skin, mode },
  );
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.slice(5);
    const body = (route.request().postData() ? route.request().postDataJSON() : {}) as Record<
      string,
      unknown
    >;
    const reply = (data: unknown) => route.fulfill({ json: { code: 0, data } });
    if (path === 'user/get/login')
      return reply({ id: '900', userName: '合成管理员', userRole: state.role, userAvatar: null });
    if (path === 'hot/list') return reply([]);
    if (path === 'user/title/list/byUserId')
      return reply(state.owned ? [{ titleId: '30', name: '合成称号' }] : []);
    const list = path.includes('/list/page') || path === 'report/admin/list';
    const stats = path === 'user/get/UserDataWebVO' || path === 'user/get/NewUserDataWebVO';
    if (list || stats) {
      state.requests.push({ path, body, query: Object.fromEntries(url.searchParams) });
      if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
      if (state.phase === 'error') return route.fulfill({ status: 503, json: {} });
      if (stats)
        return reply(
          path.endsWith('NewUserDataWebVO')
            ? state.phase === 'empty'
              ? []
              : [
                  { date: '2026-11-15', newUserCount: 3 },
                  { date: '2026-11-16', newUserCount: 4 },
                ]
            : { totalUsers: 30, todayNewUsers: 3, todayActiveUsers: 12, thisMonthActiveUsers: 20 },
        );
      const current = Number(body.current ?? url.searchParams.get('current') ?? 1);
      const id = String(state.duplicate ? 1 : current);
      const records = path.startsWith('user/title/')
        ? [{ titleId: '30', name: '合成称号' }]
        : path.startsWith('user/')
          ? [
              {
                id: state.self ? '900' : id,
                userAccount: 'synthetic-account',
                userName: '合成用户',
                userRole: state.self ? state.role : 'user',
                userProfile: '合成简介',
              },
            ]
          : path.startsWith('tags/')
            ? [{ id, tagsName: '合成标签', color: 'blue', type: 0, sort: 1 }]
            : path.startsWith('word/')
              ? [{ id, word: '海风', category: 'undercover', wordType: '日常' }]
              : path.startsWith('itemTemplates/')
                ? [
                    {
                      id,
                      name: '合成铁剑',
                      code: 'synthetic-sword',
                      category: 'equipment',
                      rarity: 1,
                      baseAttack: 10,
                      mainAttr: '{"critRate":0.03,"futureAttribute":0.07}',
                    },
                  ]
                : [
                    {
                      id,
                      reportType: 1,
                      reportTypeText: '聊天记录',
                      reasonTypeText: '不当内容',
                      reporterId: '800',
                      targetUserId: '700',
                      targetId: '600',
                      status: 0,
                      description: '合成举报说明',
                      chatMessage: { messageWrapper: { message: { content: '合成举报内容' } } },
                    },
                  ];
      const batch =
        state.batch > 1 && path === 'user/list/page'
          ? Array.from(
              {
                length: Math.min(
                  state.batch,
                  Math.max(0, state.total - (current - 1) * state.batch),
                ),
              },
              (_, i) => ({
                ...records[0],
                id: String(state.duplicate ? i + 1 : (current - 1) * state.batch + i + 1),
              }),
            )
          : records;
      return reply({
        records: state.phase === 'empty' ? [] : batch,
        total: state.phase === 'empty' ? 0 : state.total,
      });
    }
    if (/\/(add|update|delete|edit|handle|mark|toUser|fromUser)$/.test(path)) {
      expect(route.request().headers()['test-session']).toBe('synthetic-value');
      state.requests.push({ path, body, query: Object.fromEntries(url.searchParams) });
      if (state.mutationFail)
        return route.fulfill({ json: { code: 40000, message: '合成操作失败，请重试' } });
      if (path === 'user/update' && body.id === '900') state.role = String(body.userRole);
      if (path.endsWith('toUser')) state.owned = true;
      if (path.endsWith('fromUser')) state.owned = false;
      return reply(
        path === 'itemTemplates/edit'
          ? { id: '1' }
          : path.endsWith('/add') && path !== 'user/mute/add'
            ? '90'
            : true,
      );
    }
    return reply([]);
  });
  return state;
}
export async function adminMenu(page: Page, label: string) {
  const touch = (page.viewportSize()?.width ?? 1280) <= 760;
  let nav = page.getByRole('navigation', { name: '管理导航' }).filter({ visible: true });
  if (!(await nav.count())) {
    const back = page.getByRole('link', { name: '返回管理页', exact: true });
    if (touch) await back.tap();
    else await back.click();
    nav = page.getByRole('navigation', { name: '管理导航' }).filter({ visible: true });
  }
  const item = nav.getByRole('link', { name: label, exact: true });
  if (touch) await item.tap();
  else await item.click();
}
