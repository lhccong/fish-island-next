import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { defaultIsland } from '../../src/domain/my-island';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(120_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: every dock shortcut uses a readable 32px pixel icon`, async ({
      page,
    }, info) => {
      const data = defaultIsland();
      data.shortcuts.push(
        { id: 'games', label: '游戏阅读工具箱', href: '/discover/games' },
        { id: 'reader', label: '阅读', href: '/reader' },
      );
      await page.addInitScript(
        (data) => localStorage.setItem('fish-island:my-island:v1:123', JSON.stringify(data)),
        data,
      );
      const fixture = await setupChatMenu(page, skin.id, mode);
      const before = fixture.stats();
      await page.getByRole('button', { name: '打开我的小岛', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '我的小岛', exact: true });
      await dialog.getByRole('tab', { name: '手账', exact: true }).click();
      const dock = dialog.getByRole('region', { name: '快捷码头', exact: true });
      const kinds = ['garden', 'cat', 'gamepad', 'book'];
      for (const kind of kinds) {
        const icon = dock.locator(`[data-pixel-icon="${kind}"]`);
        await expect(icon).toBeVisible();
        await expect(icon).toHaveAttribute('width', '32');
        await expect(icon).toHaveAttribute('height', '32');
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
        expect((await icon.boundingBox())!.width).toBe(32);
        expect((await icon.boundingBox())!.height).toBe(32);
      }
      await expect(dock.locator('[data-pixel-icon]')).toHaveCount(4);
      for (const link of await dock.getByRole('link').all()) {
        expect(await link.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        if (page.viewportSize()!.width <= 760)
          expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await dock.getByRole('link', { name: '阅读', exact: true }).focus();
      await expect(dock.getByRole('link', { name: '阅读', exact: true })).toBeFocused();
      await dock.screenshot({ path: info.outputPath('dock-icons.png'), scale: 'css' });
      await dock.getByRole('button', { name: '编辑快捷码头', exact: true }).click();
      for (const kind of kinds)
        await expect(dock.locator(`[data-pixel-icon="${kind}"]`)).toBeVisible();
      expect(await dock.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await dialog.getByRole('button', { name: '关闭我的小岛', exact: true }).click();
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);
      await expect(page.getByRole('button', { name: '打开我的小岛', exact: true })).toBeFocused();
      if (skin.id === 'pixel-island')
        await page.screenshot({ path: info.outputPath('desktop-or-chat.png'), scale: 'css' });
    });
  }
