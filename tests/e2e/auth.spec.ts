import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const syntheticUser = { id: '123', userName: '测试岛友', userAvatar: null, userRole: 'user' };
const syntheticToken = { tokenName: 'test-session', tokenValue: 'synthetic-test-value' };
async function mockAuth(context: BrowserContext) {
  await context.route('**/api/chat/online/user', (route) =>
    route.fulfill({ json: { code: 0, data: [] } }),
  );
  const state = {
    rejectLogin: false,
    restoreFailure: false,
    expired: false,
    logoutFailure: false,
    lastBody: null as Record<string, unknown> | null,
    loginPath: '',
    logins: 0,
    restores: 0,
  };
  await context.route('**/api/hot/list', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await context.route('**/api/user/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/get/login')) {
      state.restores++;
      if (state.restoreFailure) {
        await route.abort('failed');
        return;
      }
      await route.fulfill({
        json:
          state.expired || request.headers()['test-session'] !== syntheticToken.tokenValue
            ? { code: 40100, message: '未登录' }
            : { code: 0, data: syntheticUser },
      });
    } else if (path.endsWith('/logout')) {
      expect(request.headers()['test-session']).toBe(syntheticToken.tokenValue);
      await route.fulfill({
        status: state.logoutFailure ? 503 : 200,
        json: { code: 0, data: true },
      });
    } else if (path.endsWith('/login')) {
      state.logins++;
      state.lastBody = request.postDataJSON() as Record<string, unknown>;
      state.loginPath = path;
      await route.fulfill({
        json: state.rejectLogin
          ? { code: 40000, message: '用户不存在或密码错误' }
          : { code: 0, data: { ...syntheticUser, saTokenInfo: syntheticToken } },
      });
    } else await route.fulfill({ status: 404, json: { code: 40400 } });
  });
  return state;
}

async function fillLogin(page: Page, account = 'test-account') {
  await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill(account);
  await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
}

async function storedSessions(page: Page) {
  return page.evaluate(() => ({
    local: Object.keys(localStorage).filter((key) => key.startsWith('fish-island-next.session:'))
      .length,
    session: Object.keys(sessionStorage).filter((key) =>
      key.startsWith('fish-island-next.session:'),
    ).length,
  }));
}

async function expectAccountAtStart(page: Page, name: '登录' | '用户菜单') {
  const navigation = page.getByRole('complementary', { name: '应用导航', exact: true });
  const account = navigation.getByRole('button', { name, exact: true });
  await expect(account).toHaveCount(1);
  await expect(account).toBeVisible();
  const accountBox = await account.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  });
  const chatBox = await navigation
    .getByRole('link', { name: '聊天', exact: true })
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    });
  if (page.viewportSize()!.width <= 760) expect(accountBox!.x).toBeLessThan(chatBox!.x);
  else expect(accountBox!.y).toBeLessThan(chatBox!.y);
}

test('login opens over the current page and closes with focus restored', async ({
  page,
  context,
}) => {
  await mockAuth(context);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: '登录', exact: true });
  await expectAccountAtStart(page, '登录');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '摸鱼岛', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: '今日热榜', includeHidden: true })).toBeAttached();
  await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('unsaved-account');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL('/');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole('textbox', { name: '账号或邮箱', exact: true })).toHaveValue('');
  await page.getByRole('button', { name: '关闭登录弹窗', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('account login handles failure, protected redirect, refresh and logout', async ({
  page,
  context,
}, testInfo) => {
  const server = await mockAuth(context);
  await page.goto('/chat');
  await expect(page).toHaveURL(/\/user\/login\?redirect=%2Fchat/);
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '登录', exact: true }).click();
  expect(server.logins).toBe(0);
  await fillLogin(page);
  await page.getByRole('checkbox', { name: '保持登录' }).uncheck();
  server.rejectLogin = true;
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('用户不存在或密码错误');
  expect(await storedSessions(page)).toEqual({ local: 0, session: 0 });
  server.rejectLogin = false;
  await fillLogin(page);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
  await expectAccountAtStart(page, '用户菜单');
  expect(server.lastBody).toEqual({
    userAccount: 'test-account',
    userPassword: 'synthetic-password',
  });
  expect(await storedSessions(page)).toEqual({ local: 0, session: 1 });
  await page.reload();
  await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
  expect(server.restores).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('authenticated.png'), fullPage: true });
  await page.getByRole('button', { name: '用户菜单', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('测试岛友');
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  expect(await storedSessions(page)).toEqual({ local: 0, session: 0 });
});

test('email login persists and synchronizes logout across tabs', async ({
  page,
  context,
}, testInfo) => {
  const server = await mockAuth(context);
  await page.goto('/user/login?redirect=https://example.com');
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
  await fillLogin(page, 'test@example.com');
  await page.getByRole('button', { name: '显示密码' }).click();
  await expect(page.getByLabel('密码', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect(server.loginPath).toBe('/api/user/email/login');
  expect(server.lastBody).toEqual({
    email: 'test@example.com',
    userPassword: 'synthetic-password',
  });
  expect(await storedSessions(page)).toEqual({ local: 1, session: 0 });
  const second = await context.newPage();
  await second.goto('/chat');
  await expect(second.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '用户菜单' }).click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(second.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await second.close();
});

test('recovery network failure keeps the session, expired sessions clear it', async ({
  page,
  context,
}) => {
  const server = await mockAuth(context);
  await page.goto('/user/login?redirect=/chat');
  await fillLogin(page);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
  server.restoreFailure = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: '登录状态暂时无法确认' })).toBeVisible();
  expect(await storedSessions(page)).toEqual({ local: 1, session: 0 });
  server.restoreFailure = false;
  await page.getByRole('button', { name: '重试恢复登录' }).click();
  await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
  server.expired = true;
  await page.reload();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  expect(await storedSessions(page)).toEqual({ local: 0, session: 0 });
});

test('logout failure warns after navigating away from protected content', async ({
  page,
  context,
}) => {
  const server = await mockAuth(context);
  await page.goto('/user/login?redirect=/chat');
  await fillLogin(page);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('button', { name: '用户菜单' }).click();
  server.logoutFailure = true;
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('未能确认服务器注销');
  expect(await storedSessions(page)).toEqual({ local: 0, session: 0 });
});
