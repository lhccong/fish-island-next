import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} uses the signed-in avatar without a message name`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ skinId, colorMode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', colorMode);
        },
        { skinId: skin.id, colorMode: mode },
      );
      const avatar = 'https://avatar.test/synthetic.svg';
      await page.route(avatar, (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="teal"/></svg>',
        }),
      );
      await page.route('**/api/hot/list', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: [{ id: '1', name: '头像验证热榜', data: [{ title: '头像验证条目' }] }],
          },
        }),
      );
      await page.route('**/api/user/login', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: '123',
              userName: '合成头像用户',
              userAvatar: avatar,
              userRole: 'user',
              saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
            },
          },
        }),
      );
      await page.route('**/api/user/logout', (route) =>
        route.fulfill({ json: { code: 0, data: true } }),
      );
      await page.goto('/');
      if (skin.id !== 'wps')
        await page.getByRole('button', { name: '查看头像验证热榜消息', exact: true }).click();
      const message = page.getByLabel('演示消息', { exact: true });
      if (skin.id !== 'wps') {
        await expect(message).toHaveText('看看今天的热榜我');
        await page.getByRole('textbox', { name: '消息输入框' }).fill('登录后保留草稿');
      }
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-user');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('dialog').getByRole('button', { name: '登录', exact: true }).click();
      const account = page.getByRole('button', { name: '用户菜单', exact: true });
      await expect(account.locator('img')).toHaveAttribute('src', avatar);
      await expect(account.locator('img')).toHaveAttribute('data-loaded', 'true');
      if (skin.id !== 'wps') {
        await expect(message.locator('img')).toHaveAttribute('src', avatar);
        await expect(message.locator('img')).toHaveAttribute('data-loaded', 'true');
        await expect(message).not.toContainText('合成头像用户');
        await expect(message).not.toContainText('界面演示');
        await expect(page.getByRole('textbox', { name: '消息输入框' })).toHaveValue(
          '登录后保留草稿',
        );
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('signed-in-avatar.png'), fullPage: true });
      await account.click();
      await page.getByRole('button', { name: '退出登录', exact: true }).click();
      await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
      if (skin.id !== 'wps') {
        await expect(message.locator('img')).toHaveCount(0);
        await expect(message).toHaveText('看看今天的热榜我');
      }
    });
  }
