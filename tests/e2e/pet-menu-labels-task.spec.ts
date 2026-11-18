import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';

const titles = [
  '伙伴档案',
  '行囊',
  '外观',
  '挑战',
  '物品手册',
  '补给铺',
  '自动喂食',
  '锻造台',
  '抽奖转盘',
];
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390])
      test(`${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        const nav = page.getByRole('navigation', { name: '伙伴功能', exact: true });
        await expect(nav.getByRole('button').first()).toBeEnabled();
        async function assertLabels(disabled = false) {
          for (const title of titles) {
            const button = nav.getByRole('button', { name: title, exact: true });
            await expect(button.locator('span')).toHaveText(title);
            await expect(button.locator('span')).toBeVisible();
            if (disabled) await expect(button).toBeDisabled();
            const box = (await button.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            expect(box.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 32);
            expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
          for (const [name, text] of [
            ['喂食 · 5 积分', '喂食 · 5 积分'],
            ['抚摸 · 3 积分', '抚摸 · 3 积分'],
            ['设置自动喂食', '自动喂食'],
          ]) {
            const button = page.getByRole('button', { name, exact: true });
            await expect(button.locator('span')).toHaveText(text);
            if (disabled) await expect(button).toBeDisabled();
            const box = (await button.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            expect(box.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 32);
            expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
          }
        }
        await assertLabels();
        await nav.locator('..').screenshot({ path: info.outputPath('header.png') });
        const feed = page.getByRole('button', { name: '喂食 · 5 积分', exact: true });
        await feed.locator('..').screenshot({ path: info.outputPath('care.png') });
        let submitted = false;
        let release = () => {};
        await page.route('**/api/pet/feed?*', async (route) => {
          submitted = true;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          await route.fulfill({ json: { code: 0, data: { ...state.pet, hunger: 92 } } });
        });
        if (width <= 760) await feed.tap();
        else await feed.click();
        await expect.poll(() => submitted).toBe(true);
        await expect(page.getByText('正在照料…', { exact: true })).toBeVisible();
        await expect(feed).toBeDisabled();
        await expect(feed.locator('span')).toHaveText('喂食 · 5 积分');
        release();
        await expect(feed).toBeEnabled();
        await expect(page.getByRole('meter', { name: '饱食', exact: true })).toHaveAttribute(
          'value',
          '92',
        );
        state.feedFail = true;
        const pat = page.getByRole('button', { name: '抚摸 · 3 积分', exact: true });
        if (width <= 760) await pat.tap();
        else await pat.click();
        await expect(page.getByRole('alert').filter({ hasText: '尚在冷却' })).toBeVisible();
        state.feedFail = false;
        const auto = page.getByRole('button', { name: '设置自动喂食', exact: true });
        if (width <= 760) await auto.tap();
        else await auto.click();
        const autoDialog = page.getByRole('dialog', { name: '自动喂食', exact: true });
        await expect(autoDialog).toBeVisible();
        await autoDialog.getByRole('button', { name: '关闭面板', exact: true }).click();
        await expect(auto).toBeFocused();
        for (const title of titles) {
          const button = nav.getByRole('button', { name: title, exact: true });
          if (width <= 760) await button.tap();
          else {
            await button.hover();
            await button.focus();
            await page.keyboard.press('Shift+Tab');
            await page.keyboard.press('Tab');
            await expect(button).toBeFocused();
            await expect(button).toHaveCSS('outline-style', 'solid');
            await page.keyboard.press('Enter');
          }
          const dialog = page.getByRole('dialog', { name: title, exact: true });
          await expect(dialog).toBeVisible();
          if (width <= 760)
            await dialog.getByRole('button', { name: '关闭面板', exact: true }).tap();
          else await page.keyboard.press('Escape');
          await expect(dialog).not.toBeVisible();
          await expect(button).toBeFocused();
        }
        state.empty = true;
        state.hold = true;
        await page.reload();
        await expect(page.getByText('正在整理营地资料…', { exact: true })).toBeVisible();
        await expect.poll(() => state.heldMineRequests).toBeGreaterThan(0);
        await assertLabels(true);
        state.hold = false;
        state.release();
        await expect(page.getByRole('textbox', { name: '新伙伴名字', exact: true })).toBeVisible();
        await assertLabels(true);
        state.fail = true;
        await page.reload();
        await expect(page.getByRole('alert').filter({ hasText: '合成读取失败' })).toBeVisible();
        await assertLabels(true);
        state.fail = false;
        state.empty = false;
        await page.getByRole('button', { name: '重试', exact: true }).click();
        await expect(nav.getByRole('button').first()).toBeEnabled();
        await assertLabels();
      });
