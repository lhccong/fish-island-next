import { test, expect } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: anchored emoji insertion and inline rendering`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      const open = page.getByRole('button', { name: '表情包', exact: true });
      const panel = page.getByRole('dialog', { name: '表情包', exact: true });
      await draft.fill('前替换后');
      await draft.evaluate((el) => {
        const range = document.createRange();
        range.setStart(el.firstChild!, 1);
        range.setEnd(el.firstChild!, 3);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await open.click();
      const face = panel.getByRole('button', { name: '/惊讶', exact: true });
      await expect(face).toBeVisible();
      await expect(face.getByRole('img')).toHaveJSProperty('naturalWidth', 128);
      const bounds = (await panel.boundingBox())!;
      const trigger = (await open.boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(trigger.y);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect((await face.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator('[data-radix-dialog-overlay]')).toHaveCount(0);
      const scroll = panel.getByRole('region', { name: 'Emoji 列表' });
      await scroll.hover();
      await page.mouse.wheel(0, 800);
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await expect(scroll.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
        'visibility',
        page.viewportSize()!.width > 760 ? 'visible' : 'hidden',
      );
      await panel.getByRole('button', { name: '/惊讶', exact: true }).focus();
      await expect(face).toBeInViewport();
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath('emoji-picker.png') });
      if (page.viewportSize()!.width > 760) await face.click();
      else await face.tap();
      await expect(draft).toHaveText('前后');
      await expect(draft.getByRole('img', { name: '[qqface:0]', exact: true })).toBeVisible();
      await expect(draft).toBeFocused();
      await open.click();
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      await expect(open).toBeFocused();
      await open.click();
      await panel.getByRole('button', { name: '关闭表情包' }).click();
      await expect(open).toBeFocused();
      await open.click();
      await draft.click();
      await expect(panel).not.toBeVisible();
      await expect(draft).toHaveText('前后');
      await expect(draft.getByRole('img', { name: '[qqface:0]', exact: true })).toBeVisible();
      await draft.fill('前[qqface:0]后[qqface:9999]');
      await page.route('**/api/chat/message/send', async (route) => {
        const data = route.request().postDataJSON() as { content: string; clientMessageId: string };
        expect(data.content).toBe('前[qqface:0]后[qqface:9999]');
        await route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: '1794530000099',
                content: data.content,
                clientMessageId: data.clientMessageId,
                sender: { id: '123', name: '本人合成' },
                timestamp: Date.now(),
              },
            },
          },
        });
      });
      await page.getByRole('button', { name: '发送', exact: true }).click();
      const image = page.getByRole('img', { name: '[qqface:0]', exact: true });
      await expect(image).toBeVisible();
      await expect(image).toHaveJSProperty('naturalWidth', 128);
      await expect(page.getByText('后[qqface:9999]', { exact: true })).toBeVisible();
      await image.dispatchEvent('error');
      await expect(page.getByText('[qqface:0]', { exact: true })).toBeVisible();
      await draft.fill('字'.repeat(5000));
      await open.click();
      await face.click();
      await expect(panel.getByRole('alert')).toHaveText('消息不能超过 5000 字');
      await expect(draft).toHaveText('字'.repeat(5000));
      await page.keyboard.press('Escape');
      if (page.viewportSize()!.width <= 760) {
        await open.tap();
        const box = (await scroll.boundingBox())!;
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2;
        const y = box.y + box.height - 16;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 5; step++) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - ((box.height - 32) * step) / 5 }],
          });
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        const last = panel.getByRole('button', { name: /^\// }).last();
        await last.focus();
        await expect(last).toBeInViewport();
        await page.keyboard.press('Escape');
        await session.detach();
      }
      expect(fixture.stats().connections).toBe(1);
    });
  }
