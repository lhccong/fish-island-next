import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup } from './fish-circle-fixture';

for (const skin of builtinSkins) {
  test(`${skin.id} discovery games opens the legacy game`, async ({ page }, testInfo) => {
    await page.addInitScript((id) => localStorage.setItem('fish-island:skin', id), skin.id);
    await setup(page);
    const menu =
      page.viewportSize()!.width <= 760
        ? page.getByRole('banner').getByRole('navigation', { name: '发现菜单' })
        : page.getByRole('complementary', { name: '鱼小圈导航', exact: true });
    await menu.getByRole('link', { name: '游戏', exact: true }).click();
    await expect(page).toHaveURL(/\/discover\/games$/);
    await expect(page.getByRole('heading', { name: '游戏', exact: true })).toBeVisible();
    const link = page.getByRole('link', { name: '打开人生重开模拟器（新窗口）' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://yucoder.cn/game/life');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await page.route('https://yucoder.cn/game/life', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<title>Legacy game destination</title>',
      }),
    );
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL('https://yucoder.cn/game/life');
    await popup.close();
    await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('games.png'), fullPage: true });
    const discovery = page.getByRole('navigation', { name: '发现菜单' }).filter({ visible: true });
    await discovery.getByRole('link', { name: '朋友圈', exact: true }).click();
    await expect(page).toHaveURL(/\/moments\/fish-circle$/);
  });
}

test('game catalog is public and theme switching preserves the game link', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/discover/games');
  await expect(page.getByRole('heading', { name: '人生重开模拟器' })).toBeVisible();
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  for (const skin of builtinSkins) {
    await dialog.getByRole('button', { name: skin.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
  }
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('link', { name: '打开人生重开模拟器（新窗口）' })).toBeVisible();
});
