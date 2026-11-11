import { expect, test, type Page } from '@playwright/test';

const path =
  '/oauth2/authorize?client_id=demo-client&redirect_uri=https%3A%2F%2Fclient.example%2Fcallback&scope=read%20profile&state=state%2Bvalue&response_type=code';
async function setup(page: Page) {
  const state = { app: 'ready', authorization: 'failure', calls: 0, expired: false };
  await page.route('**/api/hot/list', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/**', (route) => {
    const login = new URL(route.request().url()).pathname === '/api/user/login';
    return route.fulfill({
      json:
        state.expired && !login
          ? { code: 40100 }
          : {
              code: 0,
              data: {
                id: 'synthetic-user',
                userName: '测试岛友',
                ...(login
                  ? {
                      saTokenInfo: {
                        tokenName: 'test-session',
                        tokenValue: 'synthetic-test-value',
                      },
                    }
                  : {}),
              },
            },
    });
  });
  await page.route('**/api/auth/app/info?*', async (route) => {
    expect(new URL(route.request().url()).searchParams.get('clientId')).toBe('demo-client');
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      json:
        state.app === 'error'
          ? { code: 40000, message: '应用信息加载失败' }
          : {
              code: 0,
              data:
                state.app === 'empty'
                  ? null
                  : {
                      appName: '示例应用',
                      appWebsite: 'https://client.example',
                      appDesc: '应用描述',
                    },
            },
    });
  });
  await page.route('**/api/oauth2/authorize?*', async (route) => {
    state.calls++;
    expect(route.request().headers()['test-session']).toBe('synthetic-test-value');
    expect(Object.fromEntries(new URL(route.request().url()).searchParams)).toEqual({
      client_id: 'demo-client',
      redirect_uri: 'https://client.example/callback',
      response_type: 'code',
      scope: 'read profile',
      state: 'state+value',
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      json:
        state.authorization === 'success'
          ? {
              code: 0,
              data: 'https://client.example/callback?code=synthetic-code&state=state%2Bvalue',
            }
          : state.authorization === 'expired'
            ? { code: 40100 }
            : { code: 40000, message: '授权请求失败' },
    });
  });
  await page.route('https://client.example/callback?*', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>授权完成</h1>' }),
  );
  return state;
}
async function login(page: Page) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/user\/login\?redirect=/);
  await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-account');
  await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(path);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('SSO returns after login, expands permissions, retries and redirects once', async ({
  page,
}, testInfo) => {
  const state = await setup(page);
  await login(page);
  await expect(page.getByText('正在加载应用信息…')).toBeVisible();
  await noOverflow(page);
  await expect(page.getByRole('heading', { name: '示例应用' })).toBeVisible();
  await expect(page.getByText('以 @测试岛友 的身份授权')).toBeVisible();
  await page.getByRole('button', { name: '获取你的用户基本信息' }).click();
  await expect(page.getByText('· 用户 ID')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('sso-ready.png'), fullPage: true });
  await page.getByRole('button', { name: '允许', exact: true }).click();
  await expect(page.getByRole('button', { name: '正在授权…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('授权请求失败');
  await noOverflow(page);
  expect(state.calls).toBe(1);
  state.authorization = 'success';
  await page.getByRole('button', { name: '允许', exact: true }).click();
  await expect(page.getByRole('heading', { name: '授权完成' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('state')).toBe('state+value');
  expect(state.calls).toBe(2);
});

test('SSO shows app error and empty state, retries and denies without authorizing', async ({
  page,
}, testInfo) => {
  const state = await setup(page);
  state.app = 'error';
  await login(page);
  await expect(page.getByRole('alert')).toContainText('应用信息加载失败');
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('sso-error.png'), fullPage: true });
  state.app = 'empty';
  await page.getByRole('button', { name: '重试加载应用信息' }).click();
  await expect(page.getByText('暂无应用公开信息')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('sso-empty.png'), fullPage: true });
  await page.getByRole('button', { name: '拒绝', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect(state.calls).toBe(0);
});

test('SSO handles missing parameters and expired authorization', async ({ page }) => {
  const state = await setup(page);
  await login(page);
  await page.goto('/oauth2/authorize');
  await expect(page.getByRole('alert')).toHaveText('缺少必要的授权参数');
  await expect(page.getByRole('button', { name: '允许', exact: true })).toHaveCount(0);
  await noOverflow(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { name: '示例应用' })).toBeVisible();
  state.authorization = 'expired';
  state.expired = true;
  await page.getByRole('button', { name: '允许', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  expect(state.calls).toBe(1);
});
