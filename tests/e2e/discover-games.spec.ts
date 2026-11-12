import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup } from './fish-circle-fixture';

for (const skin of builtinSkins) {
  test(`${skin.id} discovery games runs the migrated simulator`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.addInitScript((id) => localStorage.setItem('fish-island:skin', id), skin.id);
    await setup(page);
    const menu =
      page.viewportSize()!.width <= 760
        ? page.getByRole('banner').getByRole('navigation', { name: '发现菜单' })
        : page.getByRole('complementary', { name: '鱼小圈导航', exact: true });
    await menu.getByRole('link', { name: '游戏', exact: true }).click();
    await expect(page).toHaveURL(/\/discover\/games$/);
    await expect(page.getByRole('heading', { name: '游戏', exact: true })).toBeVisible();
    const card = page.getByRole('button', { name: '打开人生重开模拟器', exact: true });
    await expect(card).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('catalog.png'), fullPage: true });
    if (page.viewportSize()!.width > 760) await card.press('Enter');
    else await card.click();
    await expect(page).toHaveURL(/\/game\/life$/);
    await page.getByRole('button', { name: '立即重开', exact: true }).click();
    await page.getByRole('button', { name: /经典模式/ }).click();
    await page.evaluate(() => {
      let seed = 1;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
    await page.getByRole('button', { name: '十连抽', exact: true }).click();
    const talents = page.locator('button[aria-pressed]');
    for (let i = 0; i < 3; i++) await talents.nth(i).click();
    await page.getByRole('button', { name: '分配属性', exact: true }).click();
    await page.getByRole('button', { name: '随机分配', exact: true }).click();
    await page.getByRole('button', { name: '开始新人生', exact: true }).click();
    await expect(page.getByText('0岁', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '下一年', exact: true }).click();
    await expect(page.getByText('1岁', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '切换主题', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '主题模式' });
    await dialog
      .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
      .click();
    await expect(page.getByText('1岁', { exact: true })).toBeAttached();
    await dialog.getByRole('button', { name: skin.name, exact: true }).click();
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(page.getByText('1岁', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('games.png'), fullPage: true });
    await page.getByRole('link', { name: '返回游戏', exact: true }).click();
    await expect(page.getByRole('button', { name: '人生重开模拟器 再玩一次' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: '打开人生重开模拟器', exact: true })).toBeVisible();
});
