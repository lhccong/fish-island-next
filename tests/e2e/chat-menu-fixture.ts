import { expect, type Page, type WebSocketRoute } from '@playwright/test';

interface ClipboardFixture {
  text: string;
  fail: boolean;
}
type FixtureWindow = Window & { chatMenuClipboard: ClipboardFixture };
export async function setupChatMenu(page: Page, skin: string, mode: string) {
  let socket!: WebSocketRoute;
  let connections = 0;
  let historyRequests = 0;
  const commands: Array<{ type: number; data?: { type?: string; content?: string } }> = [];
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      const clipboard: ClipboardFixture = { text: '', fail: false };
      (window as FixtureWindow).chatMenuClipboard = clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            if (clipboard.fail) throw new Error('synthetic clipboard failure');
            clipboard.text = value;
          },
        },
      });
    },
    { skin, mode },
  );
  await page.routeWebSocket(/\/ws\//, (ws) => {
    socket = ws;
    connections++;
    ws.onMessage((raw) => commands.push(JSON.parse(String(raw)) as (typeof commands)[number]));
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/chat/message/page/vo', (route) => {
    historyRequests++;
    return route.fulfill({ json: { code: 0, data: { records: [] } } });
  });
  await page.route('**/api/user/**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          id: '123',
          userName: '本人合成',
          userRole: 'user',
          saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
        },
      },
    }),
  );
  await page.route('https://menu.test/image.png', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#147a99"/></svg>',
    }),
  );
  await page.goto('/chat');
  await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-account');
  await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('status', { name: '聊天室连接状态', exact: true })).toHaveText(
    '已连接 · HTTP 发送 / 实时接收',
  );
  await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
  return {
    broadcast(message: Record<string, unknown>) {
      socket.send(JSON.stringify({ type: 'chat', data: { message } }));
    },
    push(id: string, content: string, self = false) {
      socket.send(
        JSON.stringify({
          type: 'chat',
          data: {
            message: {
              id,
              content,
              sender: { id: self ? '123' : '456', name: self ? '本人合成' : '合成岛友' },
              timestamp: 1794441600000 + Number(id),
            },
          },
        }),
      );
    },
    revoke(id: string) {
      socket.send(JSON.stringify({ type: 'userMessageRevoke', data: id }));
    },
    stats: () => ({ connections, historyRequests, commands }),
    clipboardText: () => page.evaluate(() => (window as FixtureWindow).chatMenuClipboard.text),
    failClipboard: (fail: boolean) =>
      page.evaluate((fail) => {
        (window as FixtureWindow).chatMenuClipboard.fail = fail;
      }, fail),
  };
}
