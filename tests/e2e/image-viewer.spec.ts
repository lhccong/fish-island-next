import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { setup as setupCircle } from './fish-circle-fixture';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: chat viewer controls, recovery and state`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      await page.context().route('https://viewer.test/*.svg', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="2400"><rect width="900" height="2400" fill="#cad8dc"/><path d="M0 400H900M0 800H900M0 1200H900M0 1600H900M0 2000H900" stroke="#435a65" stroke-width="8"/><text x="100" y="200" font-size="80">${route.request().url().includes('two') ? 'SECOND' : 'LONG IMAGE'}</text></svg>`,
        }),
      );
      fixture.push('1001', '[img]https://viewer.test/one.svg[/img]');
      fixture.push('1002', '[img]https://viewer.test/two.svg[/img]');
      await page.getByRole('textbox', { name: '消息草稿' }).fill('预览保留草稿');
      const trigger = page
        .locator('[data-message-id="1001"]')
        .getByRole('button', { name: '放大聊天图片' });
      await expect(trigger).toBeEnabled();
      const before = fixture.stats();
      const mobile = page.viewportSize()!.width <= 760;
      if (mobile) await trigger.tap();
      else await trigger.click();
      const dialog = page.getByRole('dialog', { name: '图片预览', exact: true });
      const stage = dialog.getByRole('region', { name: '图片画布' });
      const image = stage.getByRole('img');
      const button = (name: string) => dialog.getByRole('button', { name, exact: true });
      await expect(stage).toHaveAttribute('data-preview-state', 'ready');
      await expect(button('上一张')).toBeDisabled();
      const fit = (await image.boundingBox())!;
      await button('放大').click();
      expect((await image.boundingBox())!.height).toBeGreaterThan(fit.height);
      await button('原始比例').click();
      await expect(button('原始比例')).toHaveText('100%');
      expect(Math.round((await image.boundingBox())!.width)).toBe(900);
      const area = (await stage.boundingBox())!;
      const oldTransform = await image.evaluate((el) => getComputedStyle(el).transform);
      if (mobile) {
        const session = await page.context().newCDPSession(page);
        const x = area.x + area.width / 2;
        const y = area.y + area.height / 2;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let i = 1; i <= 5; i++)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - i * 20 }],
          });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
        await page.mouse.down();
        await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2 - 100, {
          steps: 5,
        });
        await page.mouse.up();
      }
      await expect
        .poll(() => image.evaluate((el) => getComputedStyle(el).transform))
        .not.toBe(oldTransform);
      await button('适应窗口').click();
      await button('向右旋转').click();
      await expect
        .poll(() => image.evaluate((el) => getComputedStyle(el).transform))
        .toContain('matrix(0, 1, -1, 0');
      await button('适应窗口').click();
      await button('缩小').click();
      expect((await image.boundingBox())!.height).toBeLessThan(fit.height);
      await button('下一张').click();
      await expect(image).toHaveAttribute('src', 'https://viewer.test/two.svg');
      await expect(button('下一张')).toBeDisabled();
      await stage.focus();
      await page.keyboard.press('ArrowLeft');
      await expect(image).toHaveAttribute('src', 'https://viewer.test/one.svg');
      await button('缩略图').click();
      await dialog.getByRole('button', { name: '查看第 2 张图片' }).click();
      await expect(image).toHaveAttribute('src', 'https://viewer.test/two.svg');
      const thumbs = dialog.getByRole('region', { name: '图片缩略图' });
      expect(await thumbs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await button('缩略图').click();
      await image.dispatchEvent('error');
      await expect(dialog.getByRole('alert')).toContainText('图片加载失败');
      await expect(button('放大')).toBeDisabled();
      await dialog.getByRole('button', { name: '重试加载大图' }).click();
      await expect(stage).toHaveAttribute('data-preview-state', 'ready');
      const popupPromise = page.waitForEvent('popup');
      await button('打开原图').click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL('https://viewer.test/two.svg');
      await popup.close();
      await button('上一张').click();
      await page.screenshot({ path: info.outputPath('viewer.png') });
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
      for (const control of await dialog.getByRole('button').all()) {
        const box = (await control.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
      if (mobile) await button('关闭图片预览').tap();
      else await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveText('预览保留草稿');
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });

    test(`${skin.id} ${mode}: circle gallery preserves entry and focus`, async ({ page }) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      const state = await setupCircle(page, false, { visual: true });
      state.media = Array.from({ length: 9 }, (_, i) => ({
        type: 'image',
        url: `https://circle.test/photo-${i}.svg`,
      }));
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('https://circle.test/photo-8.svg', async (route) => {
        await gate;
        await route.fallback();
      });
      await page.getByRole('button', { name: '刷新动态' }).click();
      const trigger = page.getByRole('button', { name: '查看图片 9', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: '图片预览' });
      try {
        await expect(dialog.getByRole('region', { name: '图片画布' })).toHaveAttribute(
          'data-preview-state',
          'loading',
        );
      } finally {
        release();
      }
      await expect(dialog.getByAltText('动态原图')).toBeVisible();
      await expect(dialog.getByRole('button', { name: '下一张', exact: true })).toBeDisabled();
      await dialog.getByRole('button', { name: '上一张', exact: true }).click();
      await expect(dialog.getByAltText('动态原图')).toHaveAttribute('src', /photo-7.svg$/);
      await dialog.getByRole('button', { name: '关闭图片预览' }).click();
      await expect(trigger).toBeFocused();
    });
  }
