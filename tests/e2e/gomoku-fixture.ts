import { expect, type Locator, type Page, type WebSocketRoute } from '@playwright/test';

export interface GameCommand {
  type: number;
  userId?: string | number;
  data?: { type: string; content: unknown };
}
export async function setupGomoku(
  page: Page,
  skin: string,
  mode: string,
  width: number,
  userId = '101',
) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      sessionStorage.setItem(
        `fish-island-next.session:${encodeURIComponent('https://api.yucoder.cn')}`,
        JSON.stringify({ name: 'synthetic-session', value: 'synthetic-value' }),
      );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            sessionStorage.setItem('synthetic-copy', text);
          },
        },
      });
    },
    { skin, mode },
  );
  const commands: GameCommand[] = [];
  let socket!: WebSocketRoute;
  let sockets = 0;
  let failSend = false;
  const user = {
    id: userId,
    userName: `合成棋手${userId}`,
    userRole: 'user',
    saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
  };
  await page.route('https://**/*', (route) => route.abort());
  await page.routeWebSocket(/\/ws\//, (ws) => {
    socket = ws;
    sockets++;
    ws.onMessage((raw) => commands.push(JSON.parse(String(raw)) as GameCommand));
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/**', (route) => route.fulfill({ json: { code: 0, data: user } }));
  await page.route('**/api/chat/message/send', async (route) => {
    const input = route.request().postDataJSON() as { content: string; clientMessageId: string };
    if (failSend) return route.fulfill({ json: { code: 50000, message: '合成发送失败' } });
    const message = {
      id: input.clientMessageId,
      content: input.content,
      clientMessageId: input.clientMessageId,
      sender: { id: userId, name: user.userName },
      timestamp: 1794654000000,
    };
    socket.send(JSON.stringify({ type: 'chat', data: { message } }));
    return route.fulfill({ json: { code: 0, data: { message } } });
  });
  await page.goto('/game/piece', { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await expect(page.getByRole('status', { name: '五子棋连接状态' })).toHaveText('联机已连接');
  const send = (type: string, data: unknown) => socket.send(JSON.stringify({ type, data }));
  return {
    commands,
    send,
    created: (roomId = 'room-123') => send('createChessRoom', { roomId, gameType: 'normal' }),
    joined: (color = 'black', roomId = 'room-123', opponentId = '202') =>
      send('joinSuccess', {
        roomId,
        yourColor: color,
        opponentId,
        playerId: opponentId,
        gameType: 'normal',
      }),
    move: (row: number, col: number, player = 'white', roomId = 'room-123') =>
      send('moveChess', { roomId, position: { row, col }, player }),
    chat: (n: number) =>
      send('chat', {
        message: {
          id: `synthetic-${n}`,
          content: `合成消息 ${n}`,
          sender: { id: '303', name: '合成岛友' },
          timestamp: 1794654000000 + n,
        },
      }),
    disconnect: () => socket.close({ code: 1012, reason: 'synthetic disconnect' }),
    sockets: () => sockets,
    failSend: (value: boolean) => {
      failSend = value;
    },
  };
}

export async function scrollRegion(page: Page, region: Locator, width: number) {
  await region.scrollIntoViewIfNeeded();
  if (width > 760) {
    await region.hover();
    await page.mouse.wheel(0, 400);
    return;
  }
  const box = (await region.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height - 10;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 6; step++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - (step * (box.height - 25)) / 6 }],
    });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  // Let native touch inertia finish before a subsequent tap; humans also need time to type.
  await region.evaluate(
    (node) =>
      new Promise<void>((resolve) => {
        let previous = node.scrollTop;
        let stable = 0;
        let frame = 0;
        const finish = () => {
          cancelAnimationFrame(frame);
          clearTimeout(deadline);
          resolve();
        };
        const deadline = setTimeout(finish, 2000);
        const tick = () => {
          stable = node.scrollTop === previous ? stable + 1 : 0;
          previous = node.scrollTop;
          if (stable >= 5) finish();
          else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }),
  );
}

export async function act(page: Page, name: string, width: number) {
  const button = page.getByRole('button', { name, exact: true });
  await button.scrollIntoViewIfNeeded();
  if (width <= 760) await button.tap();
  else await button.click();
}
export async function playPoint(page: Page, row: number, col: number, width: number) {
  const point = page.locator(`[data-point="${row}-${col}"]`);
  await point.scrollIntoViewIfNeeded();
  if (width <= 760) await point.tap();
  else await point.click();
}
export async function assertLayout(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const overflows = await page
    .locator('[role="grid"], [role="region"], form')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.scrollWidth > node.clientWidth + 2)
        .map((node) => node.getAttribute('aria-label') ?? node.tagName),
    );
  expect(overflows).toEqual([]);
  await expect(page.getByRole('button', { name: '确认落子', exact: true })).toHaveCount(0);
  const toolbar = page.getByRole('region', { name: '房间信息' });
  if (await toolbar.count()) {
    const buttons = await toolbar
      .getByRole('button')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
    for (const height of buttons) expect(height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 32);
  }
}
