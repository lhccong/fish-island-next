import { expect, test } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(90_000);
for (const mode of ['light', 'dark'])
  test(`classic ${mode}: menus use centered content and about defaults to reward`, async ({
    page,
  }, info) => {
    await setupChatMenu(page, 'moyu-island', mode, 'admin');
    const mobile = page.viewportSize()!.width <= 760;
    await expect(page.locator('[data-navigation-layout="topbar"]')).toHaveAttribute(
      'data-sidebar-hidden',
      'false',
    );
    const nav = page.getByRole('navigation', { name: '主要功能', exact: true });
    await expect(nav.getByRole('link', { name: '玩法', exact: true })).toHaveCount(0);
    if (!mobile) {
      await expect(nav.getByRole('link', { name: '工具', exact: true })).toHaveAttribute(
        'href',
        '/utils/json',
      );
      await nav.getByRole('link', { name: '关于', exact: true }).click();
      await expect(page).toHaveURL(/\/rank\/reward$/);
    } else await page.goto('/rank/reward');
    await expect(
      page.getByRole('link', { name: '赞助榜', exact: true }).filter({ visible: true }),
    ).toHaveAttribute('aria-current', 'page');
    for (const path of [
      '/reader',
      '/pet',
      '/discover/games',
      '/utils/avatar-frames',
      '/utils/json',
      '/moments/fish-circle',
      '/rank/reward',
    ]) {
      await page.goto(path);
      const shell = page.locator('[data-navigation-layout="topbar"]').filter({ visible: true });
      await expect(shell).toHaveAttribute('data-sidebar-hidden', 'true');
      await expect(shell).toHaveAttribute('data-content-centered', 'true');
      const workspace = page.locator('#main-content').locator('..');
      if (!mobile) {
        await expect(workspace).toHaveCSS('border-radius', '0px');
        await expect(workspace).toHaveCSS('box-shadow', 'none');
        await expect(workspace).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        const box = (await workspace.boundingBox())!;
        expect(box.y).toBe(52);
        expect(box.y + box.height).toBe(page.viewportSize()!.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (path === '/reader' || path === '/rank/reward')
        await page.screenshot({
          path: info.outputPath(`${path.slice(1).replaceAll('/', '-')}-${mode}.png`),
          scale: 'css',
        });
    }
    await page.goto('/admin/user');
    await expect(page.locator('[data-navigation-layout="topbar"]')).toHaveAttribute(
      'data-sidebar-hidden',
      'false',
    );
    if (!mobile)
      await expect(
        page.getByRole('complementary', { name: '管理导航', exact: true }),
      ).toBeVisible();
  });
