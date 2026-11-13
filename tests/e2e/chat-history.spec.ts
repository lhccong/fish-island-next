import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(60000);
const bagId = 'a01b23456789cdef0123456789abcdef';
const winId = 'b01b23456789cdef0123456789abcdef';
const message = (id: number, content = `合成历史 ${id}`) => ({
  id: id === 101 ? bagId : id === 51 ? winId : String(id),
  content,
  timestamp: 1794441600000 + id,
  sender: { id: '456', name: '合成岛友', avatar: null },
});
const records = (last: number) =>
  Array.from({ length: 50 }, (_, i) => ({ messageWrapper: { message: message(last - i) } }));
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: initial history, live overlap and upward cursor paging`, async ({
      page,
    }, info) => {
      let socket!: WebSocketRoute;
      let connections = 0;
      const requests: Array<Record<string, unknown>> = [];
      let releaseFirst!: () => void;
      let releaseInitial!: () => void;
      let releaseOlder!: () => void;
      const first = new Promise<void>((done) => {
        releaseFirst = done;
      });
      const initial = new Promise<void>((done) => {
        releaseInitial = done;
      });
      const older = new Promise<void>((done) => {
        releaseOlder = done;
      });
      let failOlder = true;
      let initialAttempts = 0;
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
        const body = route.request().postDataJSON() as Record<string, unknown>;
        requests.push(body);
        expect(route.request().headers()['synthetic-session']).toBe('synthetic-value');
        expect(body).toMatchObject({
          roomId: -1,
          pageSize: 50,
          sortField: 'createTime',
          sortOrder: 'desc',
        });
        if (body.current === 1) {
          initialAttempts++;
          if (initialAttempts === 1) {
            await first;
            await route.fulfill({ status: 503 });
            return;
          }
          await initial;
        }
        if (body.messageId === bagId && failOlder) {
          failOlder = false;
          await route.fulfill({ status: 503 });
          return;
        }
        if (body.messageId === winId) await older;
        const last =
          body.current === 1
            ? 150
            : body.messageId === bagId
              ? 100
              : body.messageId === winId
                ? 50
                : 0;
        await route.fulfill({ json: { code: 0, data: { records: last ? records(last) : [] } } });
      });
      await page.goto('/chat');
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      await expect.poll(() => requests.length).toBe(1);
      releaseFirst();
      const retry = page.getByRole('button', { name: '重试历史消息', exact: true });
      await expect(retry).toBeVisible();
      const mobile = page.viewportSize()!.width <= 760;
      if (mobile) await retry.tap();
      else await retry.click();
      await expect.poll(() => requests.length).toBe(2);
      socket.send(
        JSON.stringify({ type: 'chat', data: { message: message(150, '实时优先 150') } }),
      );
      socket.send(JSON.stringify({ type: 'chat', data: { message: message(151) } }));
      socket.send(JSON.stringify({ type: 'userMessageRevoke', data: '149' }));
      await expect(page.locator('[data-message-id="150"]')).toContainText('实时优先 150');
      releaseInitial();
      await expect(page.locator('[data-message-id="151"]')).toBeInViewport();
      await expect(page.locator('[data-message-id="149"]')).toContainText('消息已撤回');
      await expect(page.locator('[data-message-id="150"]')).toHaveCount(1);
      await expect(page.locator('[data-message-id="150"]')).toContainText('实时优先 150');
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('历史加载期间保留草稿');
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(retry).toBeVisible();
      await expect(page.locator(`[data-message-id="${bagId}"]`)).toBeInViewport();
      expect(requests.at(-1)?.messageId).toBe(bagId);
      if (mobile) await retry.tap();
      else await retry.click();
      await expect(page.locator(`[data-message-id="${bagId}"]`)).toBeInViewport();
      await expect(page.getByText('上滑查看更早消息', { exact: true })).toHaveCount(1);
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect.poll(() => requests.at(-1)?.messageId).toBe(winId);
      const anchor = page.locator(`[data-message-id="${winId}"]`);
      await expect(anchor).toBeInViewport();
      const anchorTop = await anchor.evaluate(async (element) => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return element.getBoundingClientRect().y;
      });
      socket.send(JSON.stringify({ type: 'chat', data: { message: message(152) } }));
      releaseOlder();
      await expect(page.getByText('上滑查看更早消息', { exact: true })).toHaveCount(1);
      await expect
        .poll(
          async () => {
            const box = await anchor.boundingBox();
            return box ? Math.abs(box.y - anchorTop) : Infinity;
          },
          { timeout: 12000 },
        )
        .toBeLessThan(5);
      await expect(page.getByRole('button', { name: '查看最新消息' })).toBeVisible();
      await expect(draft).toHaveText('历史加载期间保留草稿');
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(page.getByText('历史消息已全部加载', { exact: true })).toBeVisible();
      await expect(page.locator('[data-message-id="1"]')).toBeInViewport();
      const requestCount = requests.length;
      expect(requestCount).toBe(6);
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
      }
      expect(requests).toHaveLength(requestCount);
      expect(connections).toBe(1);
      await expect(draft).toHaveText('历史加载期间保留草稿');
      const latest = page.getByRole('button', { name: '查看最新消息' });
      if (mobile) await latest.tap();
      else await latest.click();
      await expect(page.locator('[data-message-id="152"]')).toBeInViewport();
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await page.locator('[data-message-id]').count()).toBeLessThan(80);
      await page.screenshot({ path: info.outputPath('history.png') });
    });
  }
