import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { controlled, publishUpdate } from './helpers/pwa';

test('activating an update refreshes only the tab that asked for it', async ({ page, context }) => {
  await page.goto('/foundation');
  await controlled(page);
  const second = await context.newPage();
  await second.goto('/foundation?tab=second#details');
  await controlled(second);
  let secondNavigations = 0;
  second.on('framenavigated', () => secondNavigations++);

  await publishUpdate(async () => {
    await second.evaluate(() => window.dispatchEvent(new Event('online')));
    const secondNotice = second.getByRole('region', { name: '网站更新' });
    await expect(secondNotice).toBeVisible();
    await page.bringToFront();
    await page.getByRole('button', { name: '刷新更新', exact: true }).click();
    await expect(page.locator('meta[name="pwa-e2e-update"]')).toHaveCount(1);
    expect(secondNavigations).toBe(0);
    await expect(second.locator('meta[name="pwa-e2e-update"]')).toHaveCount(0);
    await expect(secondNotice).toBeVisible();
    await second.getByRole('button', { name: '刷新更新', exact: true }).click();
    await expect(second.locator('meta[name="pwa-e2e-update"]')).toHaveCount(1);
    await expect(second).toHaveURL(/\/foundation\?tab=second#details$/);
  });
});

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    for (const width of [1440, 375, 390]) {
      test.describe(`${skin.id}-${mode}-${width}`, () => {
        test.use({
          viewport: { width, height: 900 },
          hasTouch: width < 760,
          isMobile: width < 760,
        });
        test('update notice can be postponed, retried and applied', async ({ page }) => {
          await page.clock.install();
          await page.addInitScript(
            ({ skin, mode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', mode);
              const postMessage = ServiceWorker.prototype.postMessage;
              let skipFirstActivation = true;
              ServiceWorker.prototype.postMessage = function (message, options) {
                if (message === 'FISH_ISLAND_ACTIVATE_UPDATE' && skipFirstActivation) {
                  skipFirstActivation = false;
                  return;
                }
                postMessage.call(this, message, options);
              };
            },
            { skin: skin.id, mode },
          );
          await page.route('**/api/hot/list', (route) =>
            route.fulfill({ json: { code: 0, data: [] } }),
          );
          await page.goto('/?tab=update#details');
          await controlled(page);
          const notice = page.getByRole('region', { name: '网站更新' });
          const later = notice.getByRole('button', { name: '稍后' });
          const refresh = notice.getByRole('button', { name: '刷新更新' });
          await expect(notice).toHaveCount(0);

          await publishUpdate(async () => {
            const currentControl = page.getByRole('button', { name: '刷新热榜', exact: true });
            await currentControl.focus();
            await page.evaluate(() => window.dispatchEvent(new Event('online')));
            await expect(notice.getByText('鱼岛有新版本')).toBeVisible();
            await expect(currentControl).toBeFocused();
            const size = (await notice.boundingBox())!;
            expect(size.x).toBeGreaterThanOrEqual(12);
            expect(size.x + size.width).toBeLessThanOrEqual(width - 12);
            expect(size.y).toBeGreaterThanOrEqual(12);
            expect(
              await notice.evaluate((element) => element.scrollWidth <= element.clientWidth),
            ).toBe(true);
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            for (const button of [later, refresh]) {
              expect((await button.boundingBox())!.height).toBe(width < 760 ? 44 : 32);
            }
            if (width < 760) {
              await later.tap();
            } else {
              const initialBackground = await refresh.evaluate(
                (button) => getComputedStyle(button).backgroundColor,
              );
              await refresh.hover();
              await expect
                .poll(() => refresh.evaluate((button) => getComputedStyle(button).backgroundColor))
                .not.toBe(initialBackground);
              await refresh.focus();
              await page.keyboard.press('Shift+Tab');
              await expect(later).toBeFocused();
              await expect(later).toHaveCSS('outline-width', '2px');
              await page.keyboard.press('Enter');
            }
            await expect(notice).toHaveCount(0);
            await expect(page.locator('meta[name="pwa-e2e-update"]')).toHaveCount(0);
            await page.reload();
            await expect(notice).toBeVisible();
            if (width < 760) await refresh.tap();
            else await refresh.click();
            const updating = notice.getByRole('button', { name: '正在更新…' });
            await expect(updating).toBeDisabled();
            await expect(updating.locator('[data-loading-indicator="compact"]')).toBeVisible();
            await expect(later).toBeDisabled();
            await page.clock.fastForward(10_001);
            await expect(notice.getByRole('alert')).toHaveText('更新未完成，请重试。');
            await page.screenshot({
              path: `.tmp-pwa-20261116/update-${skin.id}-${mode}-${width}.png`,
            });

            const retry = notice.getByRole('button', { name: '重试更新' });
            if (width < 760) await retry.tap();
            else await retry.click();
            await expect(page.locator('meta[name="pwa-e2e-update"]')).toHaveCount(1);
            await expect(page).toHaveURL(/\/\?tab=update#details$/);
            await expect(notice).toHaveCount(0);
            await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
            await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
          });
        });
      });
    }
  }
}
