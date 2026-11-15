import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture } from './avatar-frames-fixture';
import { assertArea } from './sign-in-layout';

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px real scroll`, () => {
    test.use({
      viewport: { width, height: width === 1280 ? 720 : 812 },
      isMobile: width < 760,
      hasTouch: width < 760,
    });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 滚轮、触屏与滑轨`, async ({ page }, info) => {
          const state = await frameFixture(page, skin.id, mode);
          state.catalog = 'ready';
          state.moreFail = false;
          state.wearFail = false;
          await page.goto('/chat');
          const draft = page.getByRole('textbox', { name: '消息草稿' });
          await draft.fill('保留头像框草稿');
          if (width < 760) await page.getByRole('link', { name: '返回热榜', exact: true }).click();
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await page.getByRole('menuitem', { name: '头像框', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: '头像框', exact: true });
          const scroll = dialog.getByRole('region', { name: '头像框列表' });
          const card = dialog.getByRole('article').filter({ hasText: '海风头像框 2' });
          await expect(card).toBeVisible();
          const use = card.getByRole('button', { name: '使用', exact: true });
          if (width < 760) {
            const box = await use.boundingBox();
            expect(box!.height).toBeGreaterThanOrEqual(44);
            await use.tap();
          } else await use.click();
          await expect(card.getByRole('button', { name: '使用中' })).toBeDisabled();
          const start = await scroll.evaluate((e) => e.scrollTop);
          const bounds = await scroll.boundingBox();
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
          expect(await scroll.evaluate((e) => e.scrollHeight)).toBeGreaterThan(bounds!.height);
          await page.screenshot({ path: info.outputPath('frames-before-scroll.png') });
          const cdp = await page.context().newCDPSession(page);
          async function scrollForward() {
            if (width >= 760) {
              await scroll.hover();
              await page.mouse.wheel(0, 420);
              return;
            }
            const box = (await scroll.boundingBox())!;
            const x = box.x + box.width / 2,
              y = box.y + box.height - 40;
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
          }
          await scrollForward();
          await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(start);
          const track = scroll.locator('..').locator('[data-orientation="vertical"]');
          await expect(track).toHaveCount(1);
          if (width < 760) await expect(track).toHaveCSS('visibility', 'hidden');
          else {
            await scroll.hover();
            await expect(track).toHaveCSS('opacity', '1');
            await expect(track).toHaveCSS('visibility', 'visible');
          }
          await assertArea(scroll, width < 760);
          for (let i = 0; i < 8; i++) await scrollForward();
          await expect(dialog.getByText('已全部加载')).toBeVisible();
          const last = dialog.getByRole('article').last().getByRole('button');
          await last.focus();
          await expect(last).toBeInViewport();
          await assertArea(scroll, width < 760);
          await page.screenshot({ path: info.outputPath('frames-scroll.png') });
          const before = { reads: state.reads, sets: state.sets, sockets: state.sockets };
          await page.evaluate(async () => {
            const path = '/src/features/appearance/index.ts';
            const { useAppearanceStore } = (await import(
              path
            )) as typeof import('../../src/features/appearance');
            useAppearanceStore.getState().setSkinId('wps');
            useAppearanceStore.getState().setColorMode('dark');
          });
          await expect(card.getByRole('button', { name: '使用中' })).toBeDisabled();
          expect({ reads: state.reads, sets: state.sets, sockets: state.sockets }).toEqual(before);
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(page.getByRole('button', { name: '用户菜单', exact: true })).toBeFocused();
          await expect(
            page
              .getByRole('button', { name: '用户菜单', exact: true })
              .locator('[data-avatar-frame] img'),
          ).toHaveAttribute('src', 'https://frame.test/2.svg');
          if (width < 760) await page.getByRole('link', { name: '聊天', exact: true }).click();
          await expect(draft).toHaveText('保留头像框草稿');
          await cdp.detach();
        });
      }
  });
}
