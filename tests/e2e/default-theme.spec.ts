import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(60_000);

for (const mode of ['light', 'dark']) {
  test(`new visitor defaults to pixel island in ${mode} mode`, async ({ page }) => {
    await page.addInitScript((mode) => {
      localStorage.setItem('fish-island:color-mode', mode);
    }, mode);
    await page.route('**/api/hot/list', (route) => route.fulfill({ json: { code: 0, data: [] } }));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'pixel-island');
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
    await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '切换主题', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '主题模式' });
    await expect(dialog.getByRole('button', { name: '摸鱼岛像素风', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    for (const skin of builtinSkins) {
      await dialog.getByRole('button', { name: skin.name, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-skin', builtinSkins.at(-1)!.id);
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
  });
}
