import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
test('全部主题明暗红包表单默认值、汇总和窄视口', async ({ page }, info) => {
  test.setTimeout(120000);
  await setupChatMenu(page, 'wechat', 'light');
  const mobile = page.viewportSize()!.width <= 760;
  if (mobile) await page.getByRole('button', { name: '更多聊天工具' }).tap();
  const launcher = page.getByRole('button', { name: '发红包', exact: true });
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        async ({ skin, mode }) => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          useAppearanceStore.getState().setSkinId(skin as never);
          useAppearanceStore.getState().setColorMode(mode as never);
        },
        { skin: skin.id, mode },
      );
      await launcher.click();
      const dialog = page.getByRole('dialog', { name: '发送红包', exact: true });
      const amount = dialog.getByRole('textbox', { name: '总积分', exact: true });
      const count = dialog.getByRole('textbox', { name: '红包个数', exact: true });
      await expect(amount).toHaveValue('100');
      await expect(count).toHaveValue('10');
      await expect(dialog.getByLabel('总积分预览')).toContainText('100');
      await amount.fill('80');
      await expect(dialog.getByLabel('总积分预览')).toContainText('80');
      await page.keyboard.press('Escape');
      await expect(launcher).toBeFocused();
      await launcher.click();
      await expect(amount).toHaveValue('80');
      await amount.fill('100');
      const region = dialog.getByRole('region', { name: '发送红包表单' });
      await region.hover();
      const track = dialog.locator('[data-orientation="vertical"]');
      if (mobile) {
        if (await track.count()) await expect(track).toHaveCSS('visibility', 'hidden');
        else await expect(track).toBeHidden();
      }
      const bounds = await amount.evaluate((e) => {
        const input = e.getBoundingClientRect(),
          row = e.closest('label')!.getBoundingClientRect(),
          viewport = e.closest('[role="region"]')!.getBoundingClientRect();
        return {
          right: viewport.right - row.right,
          overflow: viewport.width < e.closest('[role="region"]')!.scrollWidth,
          aligned: row.right - input.right,
        };
      });
      expect(bounds.right).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      expect(bounds.overflow).toBe(false);
      expect(bounds.aligned).toBeGreaterThan(0);
      await dialog.getByRole('textbox', { name: '祝福语', exact: true }).focus();
      await expect(dialog.getByRole('textbox', { name: '祝福语', exact: true })).toBeInViewport();
      await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}.png`) });
      const size = page.viewportSize()!;
      await page.setViewportSize({ width: size.width, height: 500 });
      await amount.focus();
      await expect(amount).toBeInViewport();
      await expect(dialog.getByRole('button', { name: '发送红包', exact: true })).toBeInViewport();
      await expect(dialog.getByRole('button', { name: '关闭发送红包' })).toBeInViewport();
      await page.setViewportSize(size);
      await page.keyboard.press('Escape');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
});
