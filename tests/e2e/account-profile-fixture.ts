import { expect, type Page } from '@playwright/test';

export async function mockProfile(page: Page, mode: string) {
  const state = {
    user: {
      id: '123',
      userName: '合成岛友',
      userAvatar: '',
      userProfile: '',
      momentsBgUrl: '',
      email: '',
      userRole: 'admin',
      titleId: '-1',
      vip: true,
      createTime: '2025-01-02 00:00:00',
    },
    fail: false,
    saving: false,
    updates: 0,
    hotRequests: 0,
    holdExtras: false,
    extrasFailure: false,
    failEmail: false,
    emptyExtras: false,
    releaseSave: undefined as (() => void) | undefined,
    releaseExtras: () => {},
  };
  const extrasGate = new Promise<void>((resolve) => {
    state.releaseExtras = resolve;
  });
  await page.route('**/api/**', (route) => route.abort());
  await page.route('**/api/hot/list', (route) => {
    state.hotRequests++;
    return route.fulfill({
      json: {
        code: 0,
        data: [{ id: '1', name: '资料测试热榜', data: [{ title: '合成测试条目' }] }],
      },
    });
  });
  await page.route('**/api/user/login', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          ...state.user,
          saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
        },
      },
    }),
  );
  await page.route('**/api/user/get/login', (route) =>
    route.fulfill({ json: { code: 0, data: state.user } }),
  );
  await page.route('**/api/user/update/my', async (route) => {
    state.updates++;
    expect(route.request().headers()['synthetic-session']).toBe('synthetic-value');
    if (state.fail)
      return route.fulfill({ json: { code: 40000, message: '合成校验：本月已修改用户名' } });
    const body: unknown = route.request().postDataJSON();
    if (state.saving)
      await new Promise<void>((resolve) => {
        state.releaseSave = resolve;
      });
    Object.assign(state.user, body);
    await route.fulfill({ json: { code: 0, data: true } });
  });
  await page.route(
    /\/api\/user\/(title\/list|vip\/get\/my|vip\/check\/permanent)$/,
    async (route) => {
      if (state.holdExtras) await extrasGate;
      if (state.extrasFailure)
        return route.fulfill({ json: { code: 40000, message: '合成资料读取失败' } });
      const path = new URL(route.request().url()).pathname;
      const data = state.emptyExtras
        ? path.endsWith('/title/list')
          ? []
          : path.endsWith('/permanent')
            ? false
            : null
        : path.endsWith('/title/list')
          ? [{ titleId: 7, name: '摸鱼达人' }]
          : path.endsWith('/permanent')
            ? mode === 'light'
            : {
                type: mode === 'light' ? 2 : 1,
                validDays: new Date(Date.now() + 30 * 86400000).toISOString(),
                isExpired: false,
              };
      await route.fulfill({ json: { code: 0, data } });
    },
  );
  await page.route('**/api/user/title/set?*', (route) => {
    expect(route.request().method()).toBe('POST');
    state.user.titleId = new URL(route.request().url()).searchParams.get('titleId') ?? '0';
    return route.fulfill({ json: { code: 0, data: true } });
  });
  await page.route('**/api/user/email/send', (route) =>
    route.fulfill({
      json: state.failEmail
        ? { code: 40000, message: '合成验证码发送失败' }
        : { code: 0, data: true },
    }),
  );
  await page.route('**/api/user/email/bindToAccount', (route) => {
    const body = route.request().postDataJSON() as { email: string; code: string };
    if (body.code !== '654321')
      return route.fulfill({ json: { code: 40000, message: '合成验证码错误' } });
    state.user.email = body.email;
    return route.fulfill({ json: { code: 0, data: true } });
  });
  await page.route('**/api/file/minio/upload?*', (route) =>
    route.fulfill({ json: { code: 0, data: 'https://profile.test/avatar.svg' } }),
  );
  await page.route(/https:\/\/(profile\.test|img\d\.baidu\.com)\/.*/, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="teal"/></svg>',
    }),
  );
  return state;
}
