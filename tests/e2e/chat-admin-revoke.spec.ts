import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: admin revokes another sender with retry and confirmation`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode, 'admin');
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留管理员草稿');
      fixture.push('1', '他人的合成消息');
      const row = page.locator('[data-message-id="1"]');
      const bubble = row.getByRole('group');
      let menu = await openMessageActions(page, '1');
      let action = menu.getByRole('menuitem', { name: '撤回', exact: true });
      await expect(action).toBeEnabled();
      const bounds = (await menu.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await action.focus();
      await page.screenshot({ path: info.outputPath('admin-revoke.png') });
      await page.keyboard.press('Escape');
      await expect(bubble).toBeFocused();
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      menu = await openMessageActions(page, '1');
      await expect(menu.getByRole('menuitem', { name: '撤回', exact: true })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toContainText(
        '已连接',
      );
      menu = await openMessageActions(page, '1');
      action = menu.getByRole('menuitem', { name: '撤回', exact: true });
      if (page.viewportSize()!.width <= 760) await action.tap();
      else await action.click();
      await expect(row).toContainText('等待撤回确认…');
      await expect(bubble).toHaveText('他人的合成消息');
      menu = await openMessageActions(page, '1');
      await expect(menu.getByRole('menuitem', { name: '等待撤回确认…' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await page.keyboard.press('Escape');
      await expect(row).toContainText('撤回未确认，请从消息菜单重试', { timeout: 15_000 });
      menu = await openMessageActions(page, '1');
      await menu.getByRole('menuitem', { name: '重试撤回', exact: true }).click();
      await expect(row).toContainText('等待撤回确认…');
      fixture.revoke('1');
      await expect(bubble).toHaveText('消息已撤回');
      await expect(bubble).toBeFocused();
      await expect(row.getByRole('button', { name: '更多消息操作' })).toHaveCount(0);
      await expect(row).not.toContainText('等待撤回确认…');
      await expect(draft).toHaveText('保留管理员草稿');
      expect(fixture.stats().commands.filter((command) => command.type === 2)).toEqual([
        { type: 2, userId: -1, data: { type: 'userMessageRevoke', content: '1' } },
        { type: 2, userId: -1, data: { type: 'userMessageRevoke', content: '1' } },
      ]);
      expect(fixture.stats()).toMatchObject({ connections: 2, historyRequests: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }

test('regular user only sees revoke on their own message', async ({ page }) => {
  const fixture = await setupChatMenu(page, 'pixel-island', 'light');
  fixture.push('1', '他人消息');
  fixture.push('2', '本人消息', true);
  let menu = await openMessageActions(page, '1', 'start');
  await expect(menu.getByRole('menuitem', { name: '撤回', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  menu = await openMessageActions(page, '2');
  await expect(menu.getByRole('menuitem', { name: '撤回', exact: true })).toBeEnabled();
});
