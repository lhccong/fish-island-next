import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: return refresh, failure retry and disconnected recovery`, async ({
      page,
    }, info) => {
      let socket!: WebSocketRoute;
      let connections = 0;
      let requests = 0;
      let release!: () => void;
      let response: 'empty' | 'error' | 'success' = 'empty';
      let wait: Promise<void> | undefined;
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
        requests++;
        expect(route.request().postDataJSON()).toMatchObject({ current: 1, pageSize: 50 });
        if (wait) await wait;
        if (response === 'error') return route.fulfill({ status: 503 });
        await route.fulfill({
          json: {
            code: 0,
            data: {
              records:
                response === 'empty'
                  ? []
                  : [
                      {
                        messageWrapper: {
                          message: {
                            id: '1',
                            content: '返回后最新消息',
                            timestamp: 1794441600000,
                            sender: { id: '456', name: '合成岛友' },
                          },
                        },
                      },
                    ],
            },
          },
        });
      });
      await page.goto('/chat');
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.waitForURL((url) => url.pathname !== '/user/login');
      if (new URL(page.url()).pathname !== '/chat')
        await page
          .getByRole('navigation', { name: '主要功能', exact: true })
          .getByRole('link', { name: '聊天', exact: true })
          .click();
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      await draft.fill('返回时保留草稿');
      const nav = page.getByRole('navigation', { name: '主要功能', exact: true });
      const mobile = page.viewportSize()!.width <= 760;
      const navigate = async (name: string) => {
        const link =
          mobile && name === '热榜'
            ? page.getByRole('link', { name: '返回热榜', exact: true })
            : nav.getByRole('link', { name, exact: true });
        if (mobile) await link.tap();
        else await link.click();
      };
      await navigate('热榜');
      response = 'error';
      wait = new Promise<void>((done) => {
        release = done;
      });
      await navigate('聊天');
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      await expect.poll(() => requests).toBe(2);
      release();
      wait = undefined;
      const retry = page.getByRole('button', { name: '重试历史消息', exact: true });
      await expect(retry).toBeVisible();
      response = 'success';
      if (mobile) await retry.tap();
      else await retry.click();
      await expect(page.getByText('返回后最新消息', { exact: true })).toBeVisible();
      await expect(draft).toHaveText('返回时保留草稿');
      expect(connections).toBe(1);
      await navigate('热榜');
      await socket.close({ code: 1006 });
      await navigate('聊天');
      await expect.poll(() => connections).toBe(2);
      await expect.poll(() => requests).toBe(4);
      await expect(page.locator('[data-message-id="1"]')).toHaveCount(1);
      await expect(page.locator('[data-message-id="1"]')).toBeInViewport();
      await expect(page.getByText('返回后最新消息', { exact: true })).toBeVisible();
      await expect(draft).toHaveText('返回时保留草稿');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath('return.png') });
    });
  }
