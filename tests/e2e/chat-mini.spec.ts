import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: new window opens authenticated mini Excel and returns to chat`, async ({
      page,
      hasTouch,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      await page.getByRole('textbox', { name: '消息草稿', exact: true }).fill('原窗口保留的草稿');
      const entry = page.getByRole('button', { name: '小窗模式', exact: true });
      if (skin.id === 'moyu-island' || !(await entry.isVisible()))
        await page.getByRole('button', { name: '更多聊天工具', exact: true }).click();
      if (skin.id === 'moyu-island')
        await page.getByRole('menuitem', { name: '小窗模式', exact: true }).click();
      else await entry.click();
      let miniConnections = 0;
      const context = page.context();
      await context.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await context.route('**/api/user/**', (route) =>
        route.fulfill({
          json: { code: 0, data: { id: '123', userName: '本人合成', userRole: 'user' } },
        }),
      );
      let attempts = 0;
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await context.route('**/api/chat/message/page/vo', async (route) => {
        attempts++;
        if (attempts === 1) {
          await pending;
          return route.fulfill({ status: 503 });
        }
        return route.fulfill({ json: { code: 0, data: { records: [] } } });
      });
      await context.routeWebSocket(/\/ws\//, (ws) => {
        miniConnections++;
        ws.onMessage(() => {});
      });
      const openMini = page.getByRole('link', { name: '在新窗口打开聊天小窗', exact: true });
      const openTarget = await openMini.boundingBox();
      expect(openTarget?.width).toBe(44);
      expect(openTarget?.height).toBe(44);
      const opened = context.waitForEvent('page');
      if (hasTouch) await openMini.tap();
      else if (mode === 'dark') await openMini.press('Enter');
      else await openMini.click();
      const mini = await opened;
      if (hasTouch) await mini.setViewportSize(page.viewportSize()!);
      await expect(mini).toHaveURL('/chat/mini');
      expect(await mini.evaluate(() => window.opener === null)).toBe(true);
      if (info.project.use.headless === false && !hasTouch) {
        const sourceSession = await context.newCDPSession(page);
        const miniSession = await context.newCDPSession(mini);
        const [sourceWindow, miniWindow] = await Promise.all([
          sourceSession.send('Browser.getWindowForTarget'),
          miniSession.send('Browser.getWindowForTarget'),
        ]);
        expect(miniWindow.windowId).not.toBe(sourceWindow.windowId);
        await Promise.all([sourceSession.detach(), miniSession.detach()]);
      }
      await expect(
        mini.getByRole('status').filter({ hasText: '正在加载历史消息…' }).locator('svg'),
      ).toBeVisible();
      await expect(mini.getByRole('textbox', { name: '账号或邮箱', exact: true })).toHaveCount(0);
      const select = mini.getByRole('combobox', { name: '小窗显示模式', exact: true });
      await expect(select).toHaveText('Excel 模式');
      expect((await select.boundingBox())!.width).toBe(44);
      const icon = (await select.locator('svg').boundingBox())!;
      const trigger = (await select.boundingBox())!;
      expect(Math.abs(icon.x + icon.width / 2 - trigger.x - trigger.width / 2)).toBeLessThan(1);
      expect((await select.locator('span').first().boundingBox())!.width).toBe(1);
      await expect(mini.getByRole('navigation', { name: '主要功能' })).toHaveCount(0);
      await expect(mini.getByRole('button', { name: '收起聊天窗口', exact: true })).toBeHidden();
      const surface = mini.getByRole('dialog');
      const box = (await surface.boundingBox())!;
      expect(box.x).toBe(0);
      expect(box.y).toBe(0);
      expect(box.width).toBe(mini.viewportSize()!.width);
      await mini.screenshot({ path: info.outputPath('mini-loading.png') });
      release();
      const retry = mini.getByRole('button', { name: '重试历史消息', exact: true });
      await expect(retry).toBeVisible();
      await mini.screenshot({ path: info.outputPath('mini-error.png') });
      await retry.click();
      await expect(mini.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      const draft = mini.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('新窗口自己的草稿');
      const original = await draft.elementHandle();
      await select.press('Enter');
      await mini.getByRole('option', { name: '聊天气泡', exact: true }).click();
      await expect(mini.getByLabel('消息工作表列')).toHaveCount(0);
      await expect(select).toBeFocused();
      await select.press('Enter');
      await mini.getByRole('option', { name: 'Excel 模式', exact: true }).click();
      await expect(draft).toHaveText('新窗口自己的草稿');
      expect(await draft.evaluate((el, original) => el === original, original)).toBe(true);
      expect(await surface.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await mini.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await mini.screenshot({ path: info.outputPath('mini-ready.png') });
      expect(miniConnections).toBe(1);
      expect(attempts).toBe(2);
      await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toHaveText(
        '原窗口保留的草稿',
      );
      expect(fixture.stats().connections).toBe(1);
      await mini.getByRole('button', { name: '关闭聊天窗口', exact: true }).click();
      await expect(mini).toHaveURL('/chat');
      await expect(draft).toHaveText('新窗口自己的草稿');
      await original?.dispose();
      await mini.close();
    });

test('direct mini URL keeps the existing login guard', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.goto('/chat/mini');
  await expect(page).toHaveURL(/\/user\/login\?redirect=%2Fchat%2Fmini$/);
  await expect(page.getByRole('textbox', { name: '账号或邮箱', exact: true })).toBeVisible();
});
