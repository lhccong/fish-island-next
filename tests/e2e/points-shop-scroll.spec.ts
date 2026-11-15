import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture, releaseFrameFixture } from './avatar-frames-fixture';
import { assertArea } from './sign-in-layout';

test.afterEach(({ page }) => releaseFrameFixture(page));
for (const width of [1280, 375, 390]) {
  test.describe(`${width}px real scroll`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode} 商城滚轮与触屏`, async ({ page }) => {
          const state = await frameFixture(page, skin.id, mode);
          state.catalog = 'ready';
          state.release();
          await page.route('**/api/props/list/page?*', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: {
                  total: '12',
                  records: Array.from({ length: 12 }, (_, i) => ({
                    frameId: String(i + 1),
                    name: `月卡 ${i + 1}`,
                    points: 100,
                    type: '1',
                    description: '一个月会员时间',
                    imgUrl: '',
                  })),
                },
              },
            }),
          );
          await page.goto('/utils/avatar-frames', { waitUntil: 'domcontentloaded' });
          const category = page.getByRole('button', { name: '其他物品', exact: true });
          if (width < 760) await category.tap();
          else await category.click();
          const scroll = page.getByRole('region', { name: '道具', exact: true });
          const first = scroll.getByRole('button', { name: '立即兑换' }).first();
          await expect(first).toBeVisible();
          expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 32);
          const start = await scroll.evaluate((e) => e.scrollTop);
          if (width >= 760) {
            await scroll.hover();
            await page.mouse.wheel(0, 420);
          } else {
            const cdp = await page.context().newCDPSession(page);
            const box = (await scroll.boundingBox())!;
            const x = box.x + box.width / 2,
              y = box.y + box.height - 50;
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y }],
            });
            for (let i = 1; i <= 8; i++)
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: y - i * 35 }],
              });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
          }
          await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(start);
          await assertArea(scroll, width < 760);
          const last = scroll.getByRole('button', { name: '立即兑换' }).last();
          await last.focus();
          await expect(last).toBeInViewport();
          await assertArea(scroll, width < 760);
          expect(await scroll.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
        });
      }
  });
}
