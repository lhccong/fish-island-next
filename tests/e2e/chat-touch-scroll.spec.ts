import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: dragging preserves position and long press opens actions`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      for (let id = 1; id <= 80; id++) fixture.push(String(id), `合成滚动消息 ${id}`);
      await expect(page.locator('[data-message-id="80"]')).toBeInViewport();
      if (mobile) {
        await expect(page.getByRole('button', { name: '更多消息操作' })).toHaveCount(0);
        await expect(page.locator('[data-message-actions="true"]').last()).toBeHidden();
        const touch = await page.context().newCDPSession(page);
        for (let drag = 0; drag < 3; drag++) {
          const box = (await scroll.boundingBox())!;
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 3;
          const before = await scroll.evaluate((el) => el.scrollTop);
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 8; step++) {
            await touch.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y + step * 12 }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeLessThan(before - 30);
          const held = await scroll.evaluate((el) => el.scrollTop);
          // Holding after a drag must neither open the long-press menu nor jump to latest.
          await page.waitForTimeout(800);
          expect(Math.abs((await scroll.evaluate((el) => el.scrollTop)) - held)).toBeLessThan(2);
          await expect(page.getByRole('menu')).toHaveCount(0);
          await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        }
        await touch.detach();
      } else {
        await scroll.hover();
        await page.mouse.wheel(0, -350);
        await expect(page.getByRole('button', { name: '查看最新消息' })).toBeVisible();
      }
      const beforeIncoming = await scroll.evaluate((el) => el.scrollTop);
      fixture.push('81', '回看时收到的新消息');
      await expect(page.getByLabel('1 条新消息', { exact: true })).toBeVisible();
      expect(Math.abs((await scroll.evaluate((el) => el.scrollTop)) - beforeIncoming)).toBeLessThan(
        2,
      );
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.getByRole('button', { name: '查看最新消息' }).click();
      await expect(page.locator('[data-message-id="81"]')).toBeInViewport();
      const bubble = page.locator('[data-message-id="81"]').getByRole('group');
      if (mobile) {
        await bubble.tap();
        await expect(page.getByRole('menu')).toHaveCount(0);
      }
      const menu = await openMessageActions(page, '81');
      await expect(menu.getByRole('menuitem', { name: '引用', exact: true })).toBeVisible();
      const bounds = (await menu.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.screenshot({ path: info.outputPath('touch-menu.png') });
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(bubble).toBeFocused();
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
    });
