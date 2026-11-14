import { expect, type Page, type WebSocketRoute } from '@playwright/test';
import { loadEnv } from 'vite';
const shutdowns = new WeakMap<Page, () => Promise<void>>();
export async function closeUndercoverFixture(page: Page) {
  await shutdowns.get(page)?.();
  shutdowns.delete(page);
}
export async function undercoverFixture(page: Page) {
  const base =
    loadEnv(
      process.env.UNDERCOVER_PREVIEW_DIR ? 'production' : 'development',
      process.cwd(),
      'VITE_',
    ).VITE_API_BASE_URL?.trim() || 'https://api.yucoder.cn';
  await page.addInitScript((base) => {
    sessionStorage.setItem(
      `fish-island-next.session:${encodeURIComponent(base.replace(/\/+$/, ''))}`,
      JSON.stringify({ name: 'test-session', value: 'synthetic-value' }),
    );
  }, base);
  const user = { id: '123', userName: '合成玩家', userRole: 'admin', userAvatar: null };
  const players = ['123', '456', '789'].map((userId, i) => ({
    userId,
    userName: `合成玩家${i + 1}`,
    isEliminated: false,
    voteCount: 0,
    remainingGuessCount: 3,
  }));
  const state = {
    phase: 'empty',
    delay: 0,
    fail: false,
    actionFail: false,
    calls: 0,
    actions: [] as string[],
    sends: [] as Record<string, unknown>[],
    connected: 0,
    room: {
      roomId: 'synthetic-room',
      creatorId: '123',
      creatorName: '合成房主',
      status: 'WAITING',
      participants: players,
      orderedParticipantIds: ['123', '456', '789'],
      maxPlayers: 6,
      gameMode: 2,
      role: 'undercover',
      word: '无',
      gameResult: '',
      votes: [] as { voterId: string; voterName: string; targetId: string; targetName: string }[],
    },
  };
  let broadcast: ((value: string) => void) | undefined;
  const sockets = new Set<WebSocketRoute>();
  shutdowns.set(page, async () => {
    await Promise.all([...sockets].map((socket) => socket.close()));
  });
  await page.routeWebSocket('**/ws/**', (ws) => {
    sockets.add(ws);
    state.connected++;
    broadcast = (frame) => ws.send(frame);
    ws.onMessage((raw) => {
      const frame = JSON.parse(String(raw)) as Record<string, unknown>;
      state.sends.push(frame);
    });
  });
  await page.route('**/api/**', (r) => r.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/**', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: {
          ...user,
          saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-value' },
        },
      },
    }),
  );
  await page.route('**/api/undercover/**', async (r) => {
    const url = new URL(r.request().url());
    const path = url.pathname.split('/api/undercover/')[1]!;
    expect(r.request().headers()['test-session']).toBe('synthetic-value');
    state.calls++;
    if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
    if (state.fail) return r.fulfill({ status: 503, json: {} });
    if (path === 'room/list')
      return r.fulfill({ json: { code: 0, data: state.phase === 'empty' ? [] : [state.room] } });
    if (path === 'room/byId')
      return r.fulfill({
        json: {
          code: 0,
          data: url.searchParams.get('roomId') === state.room.roomId ? state.room : null,
        },
      });
    state.actions.push(path);
    if (state.actionFail)
      return r.fulfill({ json: { code: 40000, message: '合成操作失败，请重试' } });
    let data: unknown = true;
    if (path === 'room/create') {
      const body = r.request().postDataJSON();
      state.room.gameMode = body.gameMode;
      state.room.maxPlayers = body.maxPlayers;
      state.phase = 'ready';
      data = state.room.roomId;
    }
    if (path === 'room/start') state.room.status = 'PLAYING';
    if (path === 'room/vote') {
      const body = r.request().postDataJSON();
      state.room.votes = [
        {
          voterId: '123',
          voterName: '合成玩家1',
          targetId: body.targetId,
          targetName: '合成玩家2',
        },
      ];
    }
    if (path === 'room/guess') {
      state.room.participants[0]!.remainingGuessCount--;
      data = r.request().postDataJSON().guessWord === '苹果';
      if (data) {
        state.room.status = 'ENDED';
        state.room.gameResult = '卧底猜对了平民词，卧底获胜';
      }
    }
    if (path === 'room/quit' || path === 'room/remove') state.phase = 'empty';
    return r.fulfill({ json: { code: 0, data } });
  });
  return {
    state,
    emit: (frame: object) => broadcast?.(JSON.stringify(frame)),
    login: async () => {
      await Promise.all([
        page.waitForResponse((r) => r.url().endsWith('/api/user/get/login'), { timeout: 60000 }),
        page.goto('/game/undercover'),
      ]);
      await expect(page).toHaveURL('/game/undercover');
    },
  };
}
export async function selectValue(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
export async function changeAppearance(page: Page, skin: string, mode: string) {
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '主题模式', exact: true });
  await dialog.getByRole('button', { name: skin, exact: true }).click();
  await dialog
    .getByRole('button', { name: mode === 'dark' ? '暗夜模式' : '明亮模式', exact: true })
    .click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await page.setViewportSize(viewport);
}
export async function swipeUp(page: Page, label: string) {
  const area = page.getByRole('region', { name: label, exact: true });
  await area.scrollIntoViewIfNeeded();
  const box = (await area.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const x = Math.round(box.x + box.width / 2);
  const start = Math.round(box.y + box.height - 30);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: start }],
  });
  for (let i = 1; i <= 6; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: Math.round(start - ((box.height - 60) * i) / 6) }],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await expect.poll(() => area.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
}
export async function assertUndercoverLayout(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const panel = page
    .locator('section[aria-label="同屏游戏"]:visible, section[aria-label="联机房间"]:visible')
    .first();
  const overflow = await panel.evaluate((root) =>
    [...root.querySelectorAll('input, button')]
      .filter((e) => e.getClientRects().length)
      .some((e) => {
        const box = e.getBoundingClientRect();
        return box.left < 0 || box.right > innerWidth + 1;
      }),
  );
  expect(overflow).toBe(false);
  for (const element of await page.locator('[data-radix-scroll-area-viewport]').all()) {
    if (!(await element.isVisible())) continue;
    expect(await element.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  }
  if (width <= 760) {
    for (const button of await panel.getByRole('button').all()) {
      if (await button.isVisible())
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
}
