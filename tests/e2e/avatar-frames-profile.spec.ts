import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture } from './avatar-frames-fixture';

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px profile frame`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 账号与资料头像框完整覆盖`, async ({ page }) => {
          await frameFixture(page, skin.id, mode);
          await page.route('**/api/user/get/login', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: {
                  id: 'synthetic-frame-user',
                  userName: '头像框岛友',
                  userRole: 'user',
                  userAvatar: 'https://frame.test/avatar.svg',
                  avatarFramerUrl: 'https://frame.test/frame.svg',
                },
              },
            }),
          );
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          const trigger = page.getByRole('button', { name: '用户菜单', exact: true });
          await expect(trigger.locator('[data-avatar-frame]')).toHaveCount(1);
          await trigger.click();
          await page.getByRole('menuitem', { name: '个人资料与签到', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: '个人资料', exact: true });
          const frame = dialog.locator('[data-avatar-frame]');
          await expect(frame).toHaveCount(1);
          const geometry = await frame.evaluate((e) => {
            const avatar = e.firstElementChild!.getBoundingClientRect();
            const overlay = e.querySelector(':scope > img')!.getBoundingClientRect();
            return {
              width: avatar.width,
              ratio: overlay.width / avatar.width,
              round: getComputedStyle(e.firstElementChild!).borderRadius,
              center: Math.abs(overlay.x + overlay.width / 2 - avatar.x - avatar.width / 2),
              right: overlay.right,
            };
          });
          expect(geometry.width).toBe(64);
          expect(geometry.ratio).toBeCloseTo(1.6, 2);
          expect(geometry.center).toBeLessThan(0.1);
          expect(geometry.round).toBe('50%');
          expect(geometry.right).toBeLessThan(width);
          expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          await page.keyboard.press('Escape');
          await expect(trigger).toBeFocused();
        });
      }
  });
}
