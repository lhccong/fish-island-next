import { expect, type Page } from '@playwright/test';
import { undercoverFixture } from './undercover-fixture';
export async function drawFixture(page: Page) {
  const connection = await undercoverFixture(page);
  let releaseFirstLoad = () => {};
  const firstLoad = new Promise<void>((resolve) => {
    releaseFirstLoad = resolve;
  });
  let nextSave: Promise<void> | undefined;
  const state = {
    empty: true,
    fail: false,
    actionFail: false,
    saveFail: false,
    delay: 200,
    calls: 0,
    saveRequests: 0,
    messagesSent: [] as string[],
    saves: [] as string[],
    activeSaves: 0,
    maxSaves: 0,
    room: {
      roomId: 'synthetic-draw',
      creatorId: '123',
      creatorName: '合成画家',
      status: 'WAITING',
      maxPlayers: 8,
      currentPlayers: 2,
      currentRound: 0,
      totalRounds: 6,
      currentDrawerId: '123',
      currentDrawerName: '合成画家',
      currentWord: '',
      wordHint: '水果',
      drawData: '',
      roundEndTime: '0',
      creatorOnlyMode: false,
      participants: [
        { userId: '123', userName: '合成画家', score: 0, hasGuessedCorrectly: false },
        { userId: '456', userName: '合成猜词玩家', score: 0, hasGuessedCorrectly: false },
      ],
    },
    guesses: [] as {
      userId: string;
      userName: string;
      guessWord: string;
      isCorrect: boolean;
      guessTime: string;
    }[],
  };
  await page.route('**/api/draw/**', async (route) => {
    state.calls++;
    expect(route.request().headers()['test-session']).toBe('synthetic-value');
    const path = new URL(route.request().url()).pathname.split('/api/draw/')[1]!;
    if (path === 'room/list') await firstLoad;
    if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
    if (state.fail) return route.fulfill({ status: 503, json: {} });
    if (path === 'room/list')
      return route.fulfill({ json: { code: 0, data: state.empty ? [] : [state.room] } });
    if (path === 'room/synthetic-draw')
      return route.fulfill({ json: { code: 0, data: state.empty ? null : state.room } });
    if (path.endsWith('/guesses')) return route.fulfill({ json: { code: 0, data: state.guesses } });
    if (state.actionFail)
      return route.fulfill({ json: { code: 40000, message: '合成操作失败，请重试' } });
    let data: unknown = true;
    if (path === 'room/create') {
      state.empty = false;
      const settings = route.request().postDataJSON();
      state.room.maxPlayers = settings.maxPlayers;
      state.room.totalRounds = settings.totalRounds;
      data = state.room.roomId;
    }
    if (path === 'room/join') state.room.participants[0]!.userId = '123';
    if (path === 'game/start') {
      state.room.status = 'PLAYING';
      state.room.currentWord = '苹果';
      state.room.currentRound = 1;
      state.room.roundEndTime = String(Math.floor(Date.now() / 1000) + 60);
    }
    if (path === 'game/next-round') {
      state.room.currentRound++;
      state.room.currentDrawerId = '456';
      state.room.currentDrawerName = '合成猜词玩家';
      state.room.currentWord = '';
      state.room.drawData = '';
    }
    if (path === 'game/end') {
      state.room.status = 'ENDED';
      state.room.currentWord = '苹果';
    }
    if (path === 'room/remove') state.empty = true;
    if (path === 'data/save') {
      state.saveRequests++;
      state.activeSaves++;
      state.maxSaves = Math.max(state.maxSaves, state.activeSaves);
      const pending = nextSave;
      nextSave = undefined;
      await pending;
      await new Promise((resolve) => setTimeout(resolve, 100));
      state.activeSaves--;
      if (state.saveFail) return route.fulfill({ status: 503, json: {} });
      state.room.drawData = route.request().postDataJSON().drawData;
      state.saves.push(state.room.drawData);
    }
    if (path === 'guess') {
      const body = route.request().postDataJSON();
      expect(body.messageWrapper.message.roomId).toBe(state.room.roomId);
      state.messagesSent.push(body.messageWrapper.message.content);
      const player = state.room.participants[0]!;
      if (
        !state.room.drawData ||
        state.room.currentDrawerId === player.userId ||
        player.hasGuessedCorrectly
      ) {
        data = null;
      } else {
        const correct = body.guessWord === '苹果';
        const guess = {
          userId: player.userId,
          userName: player.userName,
          guessWord: body.guessWord,
          isCorrect: correct,
          guessTime: new Date().toISOString(),
        };
        state.guesses.push(guess);
        data = guess;
        if (correct) {
          player.score = 10;
          player.hasGuessedCorrectly = true;
        }
      }
    }
    return route.fulfill({ json: { code: 0, data } });
  });
  return {
    state,
    connection,
    releaseFirstLoad,
    holdNextSave: () => {
      let release = () => {};
      nextSave = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
    refresh: () => connection.emit({ type: 'refreshDraw', data: 'synthetic-draw' }),
  };
}
export async function drawStroke(page: Page, touch: boolean) {
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 3;
  const y = box.y + box.height / 3;
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 40, y: y + 30 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 40, { steps: 8 });
    await page.mouse.up();
  }
}
export async function assertDrawLayout(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const overflow = await page
    .locator('canvas, [data-view] input, [data-view] button')
    .evaluateAll((elements) =>
      elements
        .filter((e) => e.getClientRects().length)
        .some((e) => {
          const b = e.getBoundingClientRect();
          return b.left < -1 || b.right > innerWidth + 1;
        }),
    );
  expect(overflow).toBe(false);
  for (const viewport of await page.locator('[data-radix-scroll-area-viewport]:visible').all())
    expect(await viewport.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  if (width <= 760) {
    for (const button of await page.locator('[data-view] button:visible').all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const board = page.getByRole('region', { name: '绘画区', exact: true });
  if (await board.isVisible()) {
    const layout = await board.evaluate((element) => {
      const game = element.parentElement!.parentElement!;
      const bounds = (container: Element, selector: string) =>
        container.querySelector(selector)?.getBoundingClientRect().toJSON() as DOMRect | undefined;
      return {
        game: game.getBoundingClientRect().toJSON() as DOMRect,
        board: element.getBoundingClientRect().toJSON() as DOMRect,
        canvas: bounds(element, 'canvas')!,
        tools: bounds(element, '[aria-label="画布工具"]'),
        round: bounds(element, '[aria-label="本轮信息与操作"]')!,
        players: bounds(game, '[aria-label="玩家与分数"]')!,
        activity: bounds(game, '[aria-label="聊天与猜词记录"]')!,
        guesses: bounds(game, '[aria-label="聊天与猜词记录"] [aria-label="猜词记录"]')!,
      };
    });
    expect(layout.round.bottom).toBeLessThanOrEqual(layout.canvas.top);
    expect(layout.guesses.bottom).toBeLessThanOrEqual(layout.activity.bottom);
    if (layout.tools) {
      expect(layout.tools.bottom).toBeLessThanOrEqual(layout.canvas.top);
      if (layout.board.width >= 620) {
        expect(layout.tools.right).toBeLessThanOrEqual(layout.round.left + 1);
        expect(Math.abs(layout.tools.top - layout.round.top)).toBeLessThanOrEqual(1);
      } else {
        expect(layout.round.bottom).toBeLessThanOrEqual(layout.tools.top + 1);
      }
    }
    if (layout.game.width > 800) {
      expect(layout.players.left).toBeGreaterThanOrEqual(layout.board.right);
      expect(Math.abs(layout.players.top - layout.board.top)).toBeLessThanOrEqual(1);
      expect(layout.activity.top).toBeGreaterThanOrEqual(layout.players.bottom);
    } else {
      expect(layout.activity.top).toBeGreaterThanOrEqual(layout.board.bottom);
      expect(layout.players.top).toBeGreaterThanOrEqual(layout.activity.bottom);
    }
  }
}
