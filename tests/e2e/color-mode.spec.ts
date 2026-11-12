import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { builtinSkins, getSkinTokens, type ColorMode } from '../../src/skins/builtin';
import { setup } from './fish-circle-fixture';

test.setTimeout(120_000);

async function capture(page: Page, info: TestInfo, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}
async function selectMode(page: Page, mode: ColorMode) {
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  await dialog
    .getByRole('button', { name: mode === 'dark' ? '暗夜模式' : '明亮模式', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
}

for (const skin of builtinSkins)
  for (const mode of ['dark', 'light'] as const) {
    test(`${skin.id} ${mode} covers workspace, dialogs and game state`, async ({ page }, info) => {
      test.setTimeout(120_000);
      const opposite = mode === 'dark' ? 'light' : 'dark';
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(
        ({ id, initialMode }) => {
          if (!localStorage.getItem('fish-island:skin'))
            localStorage.setItem('fish-island:skin', id);
          if (!localStorage.getItem('fish-island:color-mode'))
            localStorage.setItem('fish-island:color-mode', initialMode);
        },
        { id: skin.id, initialMode: mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      await page.route('**/api/hot/list', (route) =>
        route.fulfill({ json: { code: 0, data: [] } }),
      );
      await page.route('**/api/user/login', (route) =>
        route.fulfill({ json: { code: 40000, message: '模式验证：账号或密码错误' } }),
      );
      await page.goto('/user/login');
      const login = page.getByRole('dialog', { name: '摸鱼岛', exact: true });
      await expect(login).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await login
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-mode-account');
      await login.getByLabel('密码', { exact: true }).fill('synthetic-mode-password');
      await login.getByRole('button', { name: '登录', exact: true }).click();
      await expect(login.getByRole('alert')).toContainText('账号或密码错误');
      await capture(page, info, 'login-error');
      await login.getByRole('button', { name: '关闭登录弹窗' }).click();

      const circle = await setup(page, false, { visual: true });
      await expect(
        page.getByRole('article', { name: '合成岛友的动态', exact: true }),
      ).toBeVisible();
      await expect(page.locator('html')).toHaveCSS('color-scheme', mode);
      await expect(
        page
          .getByRole('region', { name: '鱼小圈封面', exact: true })
          .getByRole('heading', { name: '合成岛友', exact: true }),
      ).toHaveCSS('color', 'rgb(255, 255, 255)');
      await capture(page, info, 'circle-ready');
      circle.delay = 700;
      await page.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: '正在加载鱼小圈' })).toBeVisible();
      await capture(page, info, 'circle-loading');
      circle.delay = 0;
      await expect(
        page.getByRole('article', { name: '合成岛友的动态', exact: true }),
      ).toBeVisible();
      circle.fail = true;
      await page.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await capture(page, info, 'circle-error');
      circle.fail = false;
      circle.empty = true;
      await page.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await capture(page, info, 'circle-empty');

      let hotRequests = 0;
      let hotState: 'ready' | 'loading' | 'empty' | 'error' = 'ready';
      await page.route('**/api/hot/list', async (route) => {
        hotRequests++;
        const state = hotState;
        if (state === 'loading') await new Promise((resolve) => setTimeout(resolve, 700));
        if (state === 'error') return route.fulfill({ status: 503, body: 'unavailable' });
        return route.fulfill({
          json: {
            code: 0,
            data:
              state === 'empty'
                ? []
                : [
                    {
                      id: '1',
                      name: '模式验证热榜',
                      categoryName: '综合',
                      data: [{ title: '明暗模式验证条目', url: 'https://example.com/mode' }],
                    },
                  ],
          },
        });
      });
      await page.goto('/');
      await expect(page.getByRole('link', { name: /明暗模式验证条目/ })).toBeVisible();
      if (skin.id === 'wps') await page.getByRole('searchbox', { name: '查找热榜' }).fill('明暗');
      else {
        await page.getByRole('button', { name: '查看模式验证热榜消息', exact: true }).click();
        await page
          .getByRole('textbox', { name: '消息输入框', exact: true })
          .fill('模式切换保留草稿');
      }
      const before = hotRequests;
      await selectMode(page, opposite);
      await selectMode(page, mode);
      expect(hotRequests).toBe(before);
      if (skin.id === 'wps')
        await expect(page.getByRole('searchbox', { name: '查找热榜' })).toHaveValue('明暗');
      else
        await expect(page.getByRole('textbox', { name: '消息输入框', exact: true })).toHaveValue(
          '模式切换保留草稿',
        );
      await capture(page, info, 'hot-ready');
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      const option = picker.getByRole('button', { name: skin.name, exact: true });
      await expect(option).toHaveAttribute('aria-pressed', 'true');
      const preview = option.locator('[class*="previewChat"]');
      expect(
        await preview.evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--color-canvas').trim(),
        ),
      ).toBe(getSkinTokens(skin.id, mode)['--color-canvas']);
      await capture(page, info, 'theme-dialog');
      await picker.getByRole('button', { name: '关闭', exact: true }).click();
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      hotState = 'loading';
      await page.reload();
      await expect(
        page.getByRole('status').filter({ hasText: '正在获取各平台热榜' }),
      ).toBeVisible();
      await capture(page, info, 'hot-loading');
      await expect(page.getByRole('link', { name: /明暗模式验证条目/ })).toBeVisible();
      for (const state of ['empty', 'error'] as const) {
        hotState = state;
        await page.reload();
        if (state === 'empty')
          await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
        else await expect(page.getByRole('alert')).toBeVisible();
        await capture(page, info, `hot-${state}`);
      }

      await page.goto('/discover/games');
      await expect(
        page.getByRole('button', { name: '打开人生重开模拟器', exact: true }),
      ).toBeVisible();
      await capture(page, info, 'games');
      await page.getByRole('button', { name: '打开人生重开模拟器', exact: true }).click();
      await page.getByRole('button', { name: '立即重开', exact: true }).click();
      await page.getByRole('button', { name: /经典模式/ }).click();
      await page.getByRole('button', { name: '十连抽', exact: true }).click();
      const talent = page.locator('button[aria-pressed]').first();
      await talent.click();
      const selectedName = await talent.textContent();
      await selectMode(page, opposite);
      await selectMode(page, mode);
      await expect(page.locator('button[aria-pressed="true"]')).toHaveText(selectedName!);
      await capture(page, info, 'life-talents');

      await page.goto('/foundation');
      await expect(
        page.getByRole('button', { name: mode === 'dark' ? '暗夜模式' : '明亮模式', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await capture(page, info, 'foundation');
      await page.goto('/chat');
      await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
      await capture(page, info, 'chat-empty');

      await page.route('**/api/auth/app/info?*', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              appName: '模式验证应用',
              appWebsite: 'https://example.com',
              appDesc: '明暗授权页验证',
            },
          },
        }),
      );
      await page.route('**/api/oauth2/authorize?*', (route) =>
        route.fulfill({ json: { code: 40000, message: '模式验证：授权失败' } }),
      );
      await page.goto(
        '/oauth2/authorize?client_id=mode-test&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&response_type=code&scope=read',
      );
      await expect(page.getByRole('heading', { name: '模式验证应用' })).toBeVisible();
      await page.getByRole('button', { name: '获取你的用户基本信息' }).click();
      await capture(page, info, 'sso-ready');
      await page.getByRole('button', { name: '允许', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('授权失败');
      await capture(page, info, 'sso-error');
      expect(errors).toEqual([]);
    });
  }

test('saved dark background is applied before application JavaScript loads', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fish-island:color-mode', 'dark'));
  await page.route(/\/(assets\/index-[^/]+\.js|src\/main\.tsx)(\?.*)?$/, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(25, 26, 28)');
  await expect(page.locator('#root')).toBeEmpty();
});

test('persists a newly selected mode without bootstrap overrides', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/discover/games');
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'light');
  for (const mode of ['dark', 'light'] as const) {
    await selectMode(page, mode);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'wechat');
  }
});
