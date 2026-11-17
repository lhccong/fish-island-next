import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

type ViewportWindow = Window & { keyboardViewport: { height: number | null; top: number } };
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: mention, quote and sending stay above the keyboard`, async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      await page.addInitScript(() => {
        const state = { height: null as number | null, top: 0 };
        (window as ViewportWindow).keyboardViewport = state;
        Object.defineProperties(window.visualViewport!, {
          height: { configurable: true, get: () => state.height ?? innerHeight },
          offsetTop: { configurable: true, get: () => state.top },
        });
      });
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const editor = page.getByRole('textbox', { name: '消息草稿', exact: true });
      const send = page.getByRole('button', { name: '发送', exact: true });
      fixture.push('201', '合成被引用的正文');
      await expect(page.locator('[data-message-id="201"]')).toBeVisible();
      await editor.fill('原有草稿');
      await (
        await openMessageActions(page, '201')
      )
        .getByRole('menuitem', { name: '引用', exact: true })
        .click();
      await expect(page.getByRole('region', { name: '引用消息', exact: true })).toContainText(
        '合成被引用的正文',
      );
      await expect(page.getByText('已引用消息', { exact: true })).toHaveCount(0);
      await (
        await openMessageActions(page, '201')
      )
        .getByRole('menuitem', { name: '@TA', exact: true })
        .click();
      await expect(editor).toBeFocused();
      await expect(editor).toContainText('@合成岛友');
      const resizeKeyboard = async (height: number | null, top = 0) => {
        await page.evaluate(
          ({ height, top }) => {
            Object.assign((window as ViewportWindow).keyboardViewport, { height, top });
            visualViewport!.dispatchEvent(new Event('resize'));
            visualViewport!.dispatchEvent(new Event('scroll'));
          },
          { height, top },
        );
      };
      const checkVisible = async () => {
        for (const control of [editor, send]) {
          const box = (await control.boundingBox())!;
          const viewport = await page.evaluate(() => ({
            top: visualViewport!.offsetTop,
            height: visualViewport!.height,
          }));
          expect(box.y).toBeGreaterThanOrEqual(viewport.top);
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.top + viewport.height + 1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      };
      if (mobile) {
        // Simulate iOS/Android keyboards that leave the layout viewport unchanged.
        await resizeKeyboard(430, 45);
        await expect(page.locator('[data-navigation-layout]')).toHaveCSS('height', '430px');
        await editor.fill('多行内容\n'.repeat(3) + '@合成岛友 ');
      }
      await checkVisible();
      await page.screenshot({ path: info.outputPath('keyboard-quote.png') });
      await page.route('**/api/chat/message/send', (route) => route.fulfill({ status: 503 }));
      if (mobile) await send.tap();
      else await send.click();
      await expect(page.getByRole('button', { name: '重试发送', exact: true })).toBeVisible();
      await expect(editor).toHaveText('');
      await expect(page.getByRole('region', { name: '引用消息', exact: true })).toHaveCount(0);
      await editor.fill('收起键盘仍保留草稿');
      if (mobile) await resizeKeyboard(null);
      await checkVisible();
      const more = page.getByRole('button', { name: '更多聊天工具' });
      if (mobile || skin.id === 'moyu-island') await more.click();
      await page
        .getByRole(skin.id === 'moyu-island' ? 'menuitem' : 'button', {
          name: '小窗模式',
          exact: true,
        })
        .click();
      if (mobile) await resizeKeyboard(430, 30);
      await checkVisible();
      await expect(editor).toHaveText('收起键盘仍保留草稿');
      await page.screenshot({ path: info.outputPath('keyboard-floating.png') });
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
    });
  }
