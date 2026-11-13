import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

const picture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#147a99"/><circle cx="320" cy="180" r="90" fill="#f2da80"/></svg>';
test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: chat avatars and inline images`, async ({ page }, info) => {
      let socket!: WebSocketRoute;
      let connections = 0;
      let failImage = true;
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
          localStorage.setItem('fish-island:chat:show-avatars', 'false');
        },
        { skin: skin.id, mode },
      );
      await page.routeWebSocket(/\/ws\//, (ws) => {
        socket = ws;
        connections++;
        ws.onMessage(() => {});
      });
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/api/chat/message/page/vo', (route) =>
        route.fulfill({ json: { code: 0, data: { records: [] } } }),
      );
      await page.route('**/api/user/**', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: '123',
              userName: '合成用户',
              userRole: 'user',
              saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
            },
          },
        }),
      );
      await page.route('https://chat-media.test/**', async (route) => {
        if (route.request().url().endsWith('/slow.png')) await held;
        if (route.request().url().endsWith('/broken.png') && failImage)
          await route.fulfill({ status: 404 });
        else
          await route.fulfill({
            contentType: 'image/svg+xml',
            body: picture,
            headers: { 'cache-control': 'no-store' },
          });
      });
      await page.goto('/chat');
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toHaveText(
        '已连接 · HTTP 发送 / 实时接收',
      );
      await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      await page.getByRole('button', { name: '群聊详情', exact: true }).click();
      const restoredToggle = page.getByRole('switch', { name: '显示消息头像' });
      await expect(restoredToggle).not.toBeChecked();
      await restoredToggle.scrollIntoViewIfNeeded();
      await restoredToggle.click();
      await page.getByRole('button', { name: '关闭在线列表' }).click();
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('媒体测试草稿');
      const push = (
        id: string,
        content: string,
        avatar: string | null = 'https://chat-media.test/avatar.png',
      ) =>
        socket.send(
          JSON.stringify({
            type: 'chat',
            data: {
              message: {
                id,
                sender: { id: '456', name: '合成岛友', avatar },
                content,
                timestamp: 1794441600000 + Number(id),
              },
            },
          }),
        );
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      push('1', '图片前文[img]https://chat-media.test/slow.png[/img]图片后文');
      const row = page.locator('[data-message-id="1"]');
      await expect(row.locator('[data-message-avatar] img')).toHaveAttribute(
        'src',
        'https://chat-media.test/avatar.png',
      );
      await expect(row.getByText('图片加载中…')).toBeVisible();
      const frame = row.locator('[data-image-state]');
      const before = (await frame.boundingBox())!;
      release();
      await expect(frame).toHaveAttribute('data-image-state', 'ready');
      const after = (await frame.boundingBox())!;
      expect(after.height).toBeLessThanOrEqual(before.height);
      expect(Math.abs(after.width / after.height - 640 / 360)).toBeLessThan(0.02);
      await expect(row.getByRole('img', { name: '聊天图片' })).toHaveCSS('object-fit', 'contain');
      await expect(row).toContainText('图片前文');
      await expect(row).toContainText('图片后文');
      const toggle = page.getByRole('switch', { name: '显示消息头像' });
      await expect(toggle).toHaveCount(0);
      await page.getByRole('button', { name: '群聊详情', exact: true }).click();
      const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
      await expect(panel.getByRole('region', { name: '消息显示设置' })).toBeVisible();
      await page.screenshot({ path: info.outputPath('settings.png') });
      await toggle.scrollIntoViewIfNeeded();
      await expect(toggle).toBeChecked();
      if (page.viewportSize()!.width <= 760) await toggle.tap();
      else {
        await toggle.focus();
        await page.keyboard.press('Space');
      }
      await expect(toggle).not.toBeChecked();
      await page.getByRole('button', { name: '关闭在线列表' }).click();
      await expect(row.locator('[data-message-avatar]')).toHaveCount(0);
      await expect(draft).toHaveText('媒体测试草稿');
      expect(connections).toBe(1);
      push('2', '[img]https://chat-media.test/broken.png[/img]', null);
      const failed = page.locator('[data-message-id="2"]');
      await expect(failed.getByText('图片加载失败')).toBeVisible();
      failImage = false;
      const retry = failed.getByRole('button', { name: '重新加载图片' });
      if (page.viewportSize()!.width <= 760) await retry.tap();
      else await retry.click();
      await expect(failed.locator('[data-image-state]')).toHaveAttribute(
        'data-image-state',
        'ready',
      );
      push('3', '[img]javascript:alert(1)[/img]<script>invalid()</script>', null);
      await expect(page.locator('[data-message-id="3"]')).toContainText(
        '[img]javascript:alert(1)[/img]',
      );
      await expect(page.locator('[data-message-id="3"] img')).toHaveCount(0);
      await page.getByRole('button', { name: '群聊详情', exact: true }).click();
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await page.getByRole('button', { name: '关闭在线列表' }).click();
      await expect(failed.locator('[data-message-avatar]')).toHaveText('合');
      expect(connections).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('media.png') });
      // Initial restored preference was verified before receiving messages; writes persist too.
      await page.getByRole('button', { name: '群聊详情', exact: true }).click();
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await expect(toggle).not.toBeChecked();
      expect(await page.evaluate(() => localStorage.getItem('fish-island:chat:show-avatars'))).toBe(
        'false',
      );
      socket.close();
    });
  }
