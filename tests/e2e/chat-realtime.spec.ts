import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { openMessageActions } from './chat-message-actions';

test.setTimeout(90000);

const message = (id: string, content = `合成消息 ${id}`, senderId = '456') =>
  JSON.stringify({
    type: 'chat',
    data: {
      message: {
        id,
        sender: { id: senderId, name: '合成岛友' },
        content,
        timestamp: 1794441600000 + Number(id),
      },
    },
  });
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: realtime idempotency, revoke and recovery`, async ({
      page,
    }, info) => {
      await page.clock.install();
      let socket: WebSocketRoute | undefined;
      let connections = 0;
      let revokes = 0;
      let acknowledge = false;
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.routeWebSocket(/\/ws\//, (ws) => {
        socket = ws;
        connections++;
        ws.onMessage((raw) => {
          const frame = JSON.parse(String(raw));
          if (frame.data?.type === 'userMessageRevoke') {
            revokes++;
            if (acknowledge)
              ws.send(JSON.stringify({ type: 'userMessageRevoke', data: frame.data.content }));
          }
        });
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
              userName: '合成岛友',
              userRole: 'user',
              saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-value' },
            },
          },
        }),
      );
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
      const connectionStatus = page.getByRole('status', { name: '聊天室连接状态', exact: true });
      const assertSilentStatus = async () => {
        await expect(connectionStatus).toHaveCSS('clip-path', 'inset(50%)');
        await expect(connectionStatus).toHaveCSS('position', 'absolute');
        expect(await page.getByText('断线期间可能漏收消息', { exact: true }).count()).toBe(0);
        expect(await page.getByRole('button', { name: '重新连接', exact: true }).count()).toBe(0);
        const gap = await page
          .getByRole('region', { name: '群聊实时消息', exact: true })
          .evaluate((element) => {
            const viewport = element.querySelector('[aria-label="群聊消息区"]');
            return viewport!.getBoundingClientRect().top - element.getBoundingClientRect().top;
          });
        expect(Math.abs(gap)).toBeLessThanOrEqual(1);
      };
      await assertSilentStatus();
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('合成草稿保留');
      socket!.send(message('1'));
      socket!.send(message('1'));
      socket!.send(message('2', '同文不同ID'));
      socket!.send(message('3', '同文不同ID'));
      await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(page.locator('[data-message-id="1"]')).toHaveCount(1);
      await expect(page.getByText('同文不同ID', { exact: true })).toHaveCount(2);
      socket!.send(JSON.stringify({ type: 'userMessageRevoke', data: '4' }));
      socket!.send(message('4', '不应出现的正文'));
      socket!.send(message('5', '本人待撤回', '123'));
      await expect(page.locator('[data-message-id="4"]')).toContainText('消息已撤回');
      const own = page.locator('[data-message-id="5"]');
      let menu = await openMessageActions(page, '5');
      let revokeItem = menu.getByRole('menuitem', { name: '撤回', exact: true });
      if (page.viewportSize()!.width <= 760) await revokeItem.tap();
      else await revokeItem.click();
      await expect(own).toContainText('等待撤回确认');
      await expect(own).toContainText('本人待撤回');
      // Failure is based on missing server confirmation, never optimistic success.
      await page.clock.fastForward(10001);
      await expect(own).toContainText('撤回未确认', { timeout: 25000 });
      acknowledge = true;
      menu = await openMessageActions(page, '5');
      revokeItem = menu.getByRole('menuitem', { name: '重试撤回', exact: true });
      if (page.viewportSize()!.width <= 760) await revokeItem.tap();
      else await revokeItem.click();
      await expect(own).toContainText('消息已撤回');
      expect(revokes).toBe(2);
      socket!.send(message('5', '本人待撤回', '123'));
      await expect(own).not.toContainText('本人待撤回');
      socket!.close({ code: 1011, reason: 'synthetic outage' });
      await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toHaveText(
        '连接中断，正在自动重连…',
      );
      await page.clock.fastForward(1001);
      await expect.poll(() => connections).toBe(2);
      await assertSilentStatus();
      // Rapid open/close failures continue the exponent rather than resetting it at open.
      for (const [delay, expected] of [
        [2001, 3],
        [4001, 4],
      ] as const) {
        socket!.close({ code: 1011, reason: 'synthetic repeated outage' });
        await expect(connectionStatus).toHaveText('连接中断，正在自动重连…');
        await assertSilentStatus();
        await page.clock.fastForward(delay);
        await expect.poll(() => connections).toBe(expected);
        await expect(connectionStatus).toHaveText('已连接 · HTTP 发送 / 实时接收');
      }
      await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toHaveText(
        '已连接 · HTTP 发送 / 实时接收',
      );
      await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((element) => {
        element.scrollTop = 0;
      });
      socket!.send(message('1'));
      await expect(page.locator('[data-message-id="1"]')).toHaveCount(1);
      await expect(draft).toHaveText('合成草稿保留');
      await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
      if (page.viewportSize()!.width > 760) {
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await picker
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        socket!.send(message('1'));
        await picker.getByRole('button', { name: skin.name, exact: true }).click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
          .click();
        await picker.getByRole('button', { name: '关闭', exact: true }).click();
        expect(connections).toBe(4);
        await expect(draft).toHaveText('合成草稿保留');
        await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((element) => {
          element.scrollTop = 0;
        });
        await expect(page.locator('[data-message-id="1"]')).toHaveCount(1);
      }
      await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect
        .poll(() =>
          page
            .getByRole('region', { name: '群聊消息区', exact: true })
            .evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight),
        )
        .toBeLessThanOrEqual(64);
      for (let i = 6; i <= 205; i++)
        socket!.send(message(String(i), `合成消息${i} ${'长文本链接'.repeat(10)}`));
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      await expect(page.locator('[data-message-id="205"]')).toBeInViewport();
      expect(await page.locator('[data-message-id]').count()).toBeLessThan(80);
      if (page.viewportSize()!.width <= 760) {
        const initialTop = await scroll.evaluate((element) => element.scrollTop);
        const box = (await scroll.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2;
        const y = box.y + 70;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 8; step++)
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y + step * 20 }],
          });
        // End the drag without an inertial fling before the independent jump-to-top scenario.
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await expect
          .poll(() => scroll.evaluate((element) => element.scrollTop))
          .toBeLessThan(initialTop - 20);
        await touch.detach();
      }
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(page.locator('[data-message-id="1"]')).toBeInViewport();
      await expect(page.getByRole('button', { name: '查看最新消息' })).toBeVisible();
      socket!.send(message('206'));
      await expect(page.getByRole('button', { name: '查看最新消息' })).toBeVisible();
      await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeLessThan(100);
      const latest = page.getByRole('button', { name: '查看最新消息' });
      if (page.viewportSize()!.width <= 760) await latest.tap();
      else await latest.click();
      await expect(page.locator('[data-message-id="206"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      if (page.viewportSize()!.width <= 760)
        await expect(scroll).toHaveCSS('scrollbar-width', 'none');
      await page.screenshot({ path: info.outputPath('realtime.png') });
    });
  }
