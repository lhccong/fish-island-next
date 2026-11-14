import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture } from './farm-fixture';
test('像素好友菜单全部主题明暗手机触屏、排序面板与焦点', async ({ browser }) => {
  test.setTimeout(180000);
  for (const width of [375, 390]) {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width, height: 844 },
    });
    try {
      const page = await context.newPage();
      await farmFixture(page);
      await page.route('**/api/farm/friend/list', (r) =>
        r.fulfill({
          json: {
            code: 0,
            data: Array.from({ length: 12 }, (_, i) => ({
              friendId: String(600 + i),
              nickname: `合成触屏好友${i}`,
              level: 20 - i,
              avatar: '',
              canSteal: false,
            })),
          },
        }),
      );
      await page.goto('/game/farm');
      await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible({ timeout: 30000 });
      const cdp = await context.newCDPSession(page);
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
          const trigger = page.getByRole('button', { name: '好友', exact: true });
          await trigger.tap();
          const dialog = page.getByRole('dialog');
          const search = dialog.getByRole('searchbox');
          await search.fill('好友0');
          const count = await dialog.locator('li').count();
          await page.evaluate(async () => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            const store = useAppearanceStore.getState();
            store.setColorMode(store.colorMode === 'light' ? 'dark' : 'light');
          });
          await expect(search).toHaveValue('好友0');
          await expect(dialog.locator('li')).toHaveCount(count);
          await page.evaluate(async (mode) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setColorMode(mode as never);
          }, mode);
          await search.fill('');
          const sort = dialog.getByRole('combobox');
          const triggerColor = await sort.evaluate((e) => getComputedStyle(e).backgroundColor);
          await sort.tap();
          const popup = page.getByRole('listbox');
          await expect(popup).toBeVisible();
          expect(await popup.evaluate((e) => getComputedStyle(e).borderRadius)).toBe('2px');
          expect(await popup.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
            triggerColor,
          );
          await page.keyboard.press('Escape');
          await expect(sort).toBeFocused();
          await expect(dialog).toBeVisible();
          const region = dialog.getByRole('region', { name: '农场列表' });
          await expect(region.locator('li')).toHaveCount(12);
          const rect = (await region.boundingBox())!;
          const x = rect.x + rect.width / 2;
          const y = rect.y + rect.height - 30;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 10; step++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - 20 * step }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
          await region.locator('li').last().scrollIntoViewIfNeeded();
          await expect(region.locator('li').last()).toBeVisible();
          expect(await region.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          await region.locator('li').first().scrollIntoViewIfNeeded();
          await dialog.getByRole('button', { name: '关闭农场列表' }).tap();
          await expect(trigger).toBeFocused();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        }
    } finally {
      await context.close();
    }
  }
});
