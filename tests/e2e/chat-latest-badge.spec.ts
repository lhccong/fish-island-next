import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(90000);

const message = (id: number) => ({
  id: String(id),
  sender: { id: '456', name: '合成岛友' },
  content: `合成消息 ${id}`,
  timestamp: 1794441600000 + id,
});
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: latest icon and new message badge`, async ({ page }, info) => {
      let socket!: WebSocketRoute;
      let failHistory = true;
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.routeWebSocket(/\/ws\//, (ws) => {
        socket = ws;
        ws.onMessage(() => {});
      });
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
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
      await page.route('**/api/chat/message/page/vo', async (route) => {
        if (failHistory) {
          failHistory = false;
          await route.fulfill({ status: 503 });
          return;
        }
        await route.fulfill({ json: { code: 0, data: { records: [] } } });
      });
      await page.goto('/chat', { waitUntil: 'domcontentloaded' });
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      const latest = page.getByRole('button', { name: '查看最新消息', exact: true });
      await expect(page.getByRole('button', { name: '重试历史消息', exact: true })).toBeVisible();
      await expect(latest).toHaveCount(0);
      await page.getByRole('button', { name: '重试历史消息', exact: true }).click();
      await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      await expect(latest).toHaveCount(0);
      for (let id = 1; id <= 80; id++)
        socket.send(JSON.stringify({ type: 'chat', data: { message: message(id) } }));
      await expect(page.locator('[data-message-id="80"]')).toBeInViewport();
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      const mobile = page.viewportSize()!.width <= 760;
      if (mobile) {
        const initialTop = await scroll.evaluate((e) => e.scrollTop);
        const bounds = (await scroll.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + 40;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 6; step++)
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y + step * 20 }],
          });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeLessThan(initialTop - 20);
        await touch.detach();
      }
      await scroll.hover();
      await page.mouse.wheel(0, -100000);
      await expect(latest).toBeVisible();
      await expect(latest.locator('svg')).toHaveCount(1);
      await expect(latest.locator('span')).toHaveCount(0);
      socket.send(JSON.stringify({ type: 'chat', data: { message: message(81) } }));
      await expect(latest.getByLabel('1 条新消息', { exact: true })).toHaveText('1');
      socket.send(JSON.stringify({ type: 'chat', data: { message: message(81) } }));
      socket.send(JSON.stringify({ type: 'chat', data: { message: message(82) } }));
      await expect(latest.getByLabel('2 条新消息', { exact: true })).toHaveText('2');
      expect(await scroll.evaluate((e) => e.scrollTop)).toBeLessThan(100);
      const box = (await latest.boundingBox())!;
      expect(box.width).toBe(mobile ? 44 : 32);
      expect(box.height).toBe(mobile ? 44 : 32);
      await latest.focus();
      await latest.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(latest).toHaveCSS('outline-style', 'solid');
      await page.screenshot({ path: info.outputPath('latest-badge.png') });
      if (mobile) await latest.tap();
      else await latest.click();
      await expect(page.locator('[data-message-id="82"]')).toBeInViewport();
      await expect(latest).toHaveCount(0);
      await scroll.hover();
      await page.mouse.wheel(0, -100000);
      await expect(latest).toBeVisible();
      await expect(latest.locator('span')).toHaveCount(0);
      for (let id = 83; id <= 182; id++)
        socket.send(JSON.stringify({ type: 'chat', data: { message: message(id) } }));
      await expect(latest.getByLabel('100 条新消息', { exact: true })).toHaveText('99+');
      await scroll.evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      await expect(latest).toHaveCount(0);
      expect(await scroll.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (mobile) await expect(scroll).toHaveCSS('scrollbar-width', 'none');
    });
