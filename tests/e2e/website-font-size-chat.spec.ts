import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} resizing text preserves the active chat`, async ({ page }) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const message = page.getByText('字号测试消息', { exact: true });
      fixture.push('1', '字号测试消息');
      await expect(message).toBeVisible();
      const originalSize = await message.evaluate((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      );
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('字号调整前的草稿');
      const { connections, historyRequests } = fixture.stats();

      const theme = page.getByRole('button', { name: '切换主题', exact: true });
      await theme.click();
      await page.getByRole('button', { name: '网站设置', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '网站设置', exact: true });
      const classic = skin.id === 'moyu-island';
      const mobile = page.viewportSize()!.width <= 760;
      if (classic) {
        const position = dialog.getByRole('combobox', { name: '电脑端菜单位置' });
        const side = page.getByRole('option', { name: '侧边菜单' });
        if (mobile) {
          await position.tap();
          await side.tap();
        } else {
          await position.click();
          await side.click();
        }
      }
      await dialog.getByRole('combobox', { name: '界面字号' }).click();
      await page.getByRole('option', { name: '特大（120%）' }).click();
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog.getByRole('status')).toHaveText('已保存到此浏览器');
      await dialog.getByRole('button', { name: '关闭网站设置' }).click();

      await expect(message).toBeVisible();
      expect(await message.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(
        originalSize * 1.2,
      );
      await expect(draft).toHaveText('字号调整前的草稿');
      await expect(theme).toBeFocused();
      expect(fixture.stats()).toMatchObject({ connections, historyRequests });
      fixture.push('2', '字号调整后的实时消息');
      await expect(page.getByText('字号调整后的实时消息', { exact: true })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (classic) {
        const shell = page.locator('[data-navigation-layout="side"]').filter({ visible: true });
        const rail = shell.getByRole('complementary', { name: '应用导航', exact: true });
        if (mobile) await expect(rail).toBeHidden();
        else {
          await expect(shell.locator('#classic-circle-sidebar')).toBeVisible();
          const main = (await shell.locator('#main-content').boundingBox())!;
          const menu = (await rail.boundingBox())!;
          expect(main.x).toBeGreaterThan(menu.x + menu.width);
          const about = rail.getByRole('link', { name: '关于', exact: true });
          await about.click();
          await expect(page).toHaveURL(/\/rank\/reward$/);
          await expect(about).toHaveAttribute('aria-current', 'page');
          await rail.getByRole('link', { name: '聊天', exact: true }).click();
          await expect(draft).toHaveText('字号调整前的草稿');
        }
      }
    });
  }
