import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: five message menu actions and focus`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('原有草稿');
      fixture.push('1', '本人原文', true);
      fixture.push('2', '岛友原文');
      const own = page.locator('[data-message-id="1"]').getByRole('group');
      await expect(own).toBeVisible({ timeout: 15000 });
      await own.scrollIntoViewIfNeeded();
      if (mobile) {
        const touch = await page.context().newCDPSession(page);
        const box = (await own.boundingBox())!;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
        });
        await expect(page.getByRole('menu')).toBeVisible();
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await touch.detach();
      } else {
        await own.focus();
        await own.press('Shift+F10');
      }
      let menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      expect(await menu.getByRole('menuitem').allTextContents()).toEqual([
        '复制',
        '引用',
        '@TA',
        '复读机',
        '撤回',
      ]);
      const bounds = (await menu.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      if (!mobile) await menu.getByRole('menuitem', { name: '撤回', exact: true }).hover();
      await page.screenshot({ path: info.outputPath('menu.png') });
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(own).toBeFocused();
      const select = async (id: string, label: string) => {
        menu = await openMessageActions(page, id, id === '1' ? 'start' : 'end');
        const item = menu.getByRole('menuitem', { name: label, exact: true });
        if (mobile) await item.tap();
        else await item.click();
        await expect(menu).toHaveCount(0);
      };
      await select('1', '复制');
      await expect.poll(fixture.clipboardText).toBe('本人原文');
      await expect(page.getByText('已复制消息文字或图片链接', { exact: true })).toBeVisible();
      menu = await openMessageActions(page, '2');
      expect(await menu.getByRole('menuitem').allTextContents()).toEqual([
        '复制',
        '引用',
        '@TA',
        '复读机',
      ]);
      await page.keyboard.press('Escape');
      await fixture.failClipboard(true);
      await select('2', '复制');
      await expect(
        page.getByText('复制失败，请选中消息文字后手动复制', { exact: true }),
      ).toBeVisible();
      await fixture.failClipboard(false);
      await select('2', '引用');
      const quote = page.getByRole('region', { name: '引用消息', exact: true });
      await expect(quote).toContainText('岛友原文');
      await expect(draft).toHaveText('原有草稿');
      await expect(draft).toBeFocused();
      await select('2', '@TA');
      await expect(draft).toHaveText('原有草稿 @合成岛友 ');
      await expect(draft).toBeFocused();
      await select('2', '复读机');
      const prepared = '原有草稿 @合成岛友 \n岛友原文';
      await expect(draft).toHaveText(prepared);
      await expect(page.getByText('已将消息追加到草稿', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
      expect(fixture.stats().commands.filter((command) => command.type === 2)).toHaveLength(0);
      await page.screenshot({ path: info.outputPath('draft.png') });
      if (!mobile) {
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await picker
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await picker.getByRole('button', { name: skin.name, exact: true }).click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
          .click();
        await picker.getByRole('button', { name: '关闭', exact: true }).click();
        await expect(draft).toHaveText(prepared);
        await expect(quote).toContainText('岛友原文');
      }
      fixture.revoke('2');
      await expect(quote).toContainText('引用消息已撤回');
      await expect(quote).not.toContainText('岛友原文');
      await page.getByRole('button', { name: '取消引用', exact: true }).click();
      await expect(quote).toHaveCount(0);
      await expect(draft).toHaveText(prepared);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toHaveText(
        '网络已离线，恢复网络后自动连接',
      );
      menu = await openMessageActions(page, '1', 'start');
      await expect(menu.getByRole('menuitem', { name: '撤回', exact: true })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toHaveText(
        '已连接 · HTTP 发送 / 实时接收',
      );
      await select('1', '撤回');
      await expect(page.locator('[data-message-id="1"]')).toContainText('等待撤回确认…');
      await expect(own).toContainText('本人原文');
      menu = await openMessageActions(page, '1', 'start');
      await expect(
        menu.getByRole('menuitem', { name: '等待撤回确认…', exact: true }),
      ).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
      fixture.revoke('1');
      await expect(own).toContainText('消息已撤回');
      await expect(own).not.toContainText('本人原文');
      await expect(own).toBeFocused();
      await expect(own).not.toHaveAttribute('aria-haspopup');
      fixture.push('3', '[img]https://menu.test/image.png[/img]');
      await select('3', '复制');
      await expect.poll(fixture.clipboardText).toBe('https://menu.test/image.png');
      expect(fixture.stats().commands.filter((command) => command.type === 2)).toEqual([
        { type: 2, userId: -1, data: { type: 'userMessageRevoke', content: '1' } },
      ]);
      expect(fixture.stats()).toMatchObject({ connections: 2, historyRequests: 1 });
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(draft).toHaveText(prepared);
      expect(errors).toEqual([]);
    });
  }
