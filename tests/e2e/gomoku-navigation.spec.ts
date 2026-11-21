import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { act, playPoint, setupGomoku } from './gomoku-fixture';

test.setTimeout(120000);
test('two isolated accounts exchange the real legacy envelopes and agree on the result', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4186', hasTouch: true });
  const opponent = await context.newPage();
  try {
    const black = await setupGomoku(page, 'wechat', 'light', 1440, '101');
    const white = await setupGomoku(opponent, 'wps', 'dark', 390, '202');
    await act(page, '创建联机房间', 1440);
    black.created('two-room');
    await expect(page.getByRole('region', { name: '房间信息' })).toContainText('two-room');
    await opponent.getByLabel('房间号', { exact: true }).fill('two-room');
    await act(opponent, '加入房间', 390);
    black.joined('black', 'two-room', '202');
    white.joined('white', 'two-room', '101');
    for (let col = 0; col < 5; col++) {
      await playPoint(page, 7, col, 1440);
      const fromBlack = black.commands
        .filter((command) => command.data?.type === 'moveChess')
        .at(-1)!;
      expect(fromBlack.userId).toBe('202');
      white.send('moveChess', fromBlack.data!.content);
      await expect(opponent.locator(`[data-point="7-${col}"]`)).toHaveAttribute(
        'data-stone',
        'black',
      );
      if (col < 4) {
        await playPoint(opponent, 8, col, 390);
        const fromWhite = white.commands
          .filter((command) => command.data?.type === 'moveChess')
          .at(-1)!;
        expect(fromWhite.userId).toBe('101');
        black.send('moveChess', fromWhite.data!.content);
        black.send('moveChess', fromWhite.data!.content);
        await expect(page.locator(`[data-point="8-${col}"]`)).toHaveAttribute(
          'data-stone',
          'white',
        );
      }
    }
    await expect(
      page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
    ).toContainText('黑棋获胜 · 你赢了！');
    await expect(
      opponent.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
    ).toContainText('黑棋获胜 · 对方获胜');
    expect(black.sockets()).toBe(1);
    expect(white.sockets()).toBe(1);
  } finally {
    await context.close();
  }
});

test('public chat opens a waiting room as a player, and unanswered room requests time out', async ({
  page,
}) => {
  const f = await setupGomoku(page, 'wechat', 'light', 1440);
  await page.route('**/api/chat/message/page/vo', (route) =>
    route.fulfill({ json: { code: 0, data: { records: [] } } }),
  );
  await page.getByRole('link', { name: '聊天', exact: true }).click();
  await expect(page).toHaveURL('/chat');
  f.send('chat', {
    message: {
      id: 'synthetic-invite',
      content: '[invite/chess]g-invite-room[/invite]',
      sender: { id: '202', name: '合成岛友' },
      timestamp: 1794654000000,
    },
  });
  await page.getByRole('button', { name: '加入五子棋房间 g-invite-room', exact: true }).click();
  const join = () => f.commands.find((command) => command.data?.type === 'joinRoom')?.data;
  await expect.poll(join).toEqual({ type: 'joinRoom', content: 'g-invite-room' });
  f.send('joinSuccess', {
    roomId: 'g-invite-room',
    yourColor: 'white',
    playerId: '202',
    spectatable: true,
  });
  await expect(page.getByRole('grid')).toHaveAttribute('aria-readonly', 'false');
  await expect(page.getByRole('region', { name: '房间信息' })).toContainText('g-invite-room');
  await expect(page).toHaveURL('/game/piece');
  expect(f.sockets()).toBe(1);
  await act(page, '退出房间', 1440);
  await act(page, '确认退出', 1440);
  await page.clock.install();
  await act(page, '创建联机房间', 1440);
  await page.clock.runFor(12001);
  await expect(page.getByRole('alert')).toContainText('房间请求超时');
  f.created('late-room');
  await expect(page.getByRole('button', { name: '创建联机房间', exact: true })).toBeVisible();
});

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: chat invitation offers distinct play and watch actions`, async ({
        page,
      }, info) => {
        const f = await setupGomoku(page, skin.id, mode, width);
        await page.route('**/api/chat/message/page/vo', (route) =>
          route.fulfill({ json: { code: 0, data: { records: [] } } }),
        );
        const roomId = 'g-in-progress';
        await page.goto('/chat');
        await expect(page.getByRole('status', { name: '聊天室连接状态' })).toContainText('已连接');
        f.send('chat', {
          message: {
            id: 'synthetic-old-invite',
            content: `[invite/chess]${roomId}[/invite]`,
            sender: { id: '202', name: '合成岛友' },
            timestamp: 1794654000000,
          },
        });
        const draft = page.getByRole('textbox', { name: '消息草稿' });
        await draft.fill('合成保留草稿');
        const joinName = `加入五子棋房间 ${roomId}`;
        const watchName = `观战五子棋房间 ${roomId}`;
        for (const name of [joinName, watchName]) {
          const action = page.getByRole('button', { name, exact: true });
          await expect(action).toBeEnabled();
          const box = (await action.boundingBox())!;
          expect(box.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 32);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          if (width > 760) {
            await action.hover();
            await action.focus();
            await expect(action).toBeFocused();
          }
        }
        if (skin.id === 'wechat') await page.screenshot({ path: info.outputPath('invite.png') });
        await act(page, joinName, width);
        const joinCommands = () =>
          f.commands.filter((command) => command.data?.type === 'joinRoom');
        await expect
          .poll(() => joinCommands().at(-1)?.data)
          .toEqual({ type: 'joinRoom', content: roomId });
        f.send('error', '合成对局已开局');
        await expect(page.getByRole('alert')).toContainText('合成对局已开局');
        expect(f.commands.some((command) => command.data?.type === 'watchChess')).toBe(false);
        await page.goBack();
        await expect(draft).toHaveText('合成保留草稿');
        await act(page, watchName, width);
        const watch = () =>
          f.commands.find((command) => command.data?.type === 'watchChess')?.data?.content;
        await expect.poll(watch).toMatchObject({ roomId, requestId: expect.any(String) });
        const request = watch() as { roomId: string; requestId: string };
        f.send('chessWatched', {
          ...request,
          black: { name: '合成黑棋手' },
          white: { name: '合成白棋手' },
          moves: [{ row: 7, col: 7, player: 'black' }],
        });
        const board = page.getByRole('grid');
        await expect(board).toHaveAttribute('aria-readonly', 'true');
        await expect(board.locator('[data-point="7-7"]')).toHaveAttribute('data-stone', 'black');
        expect(joinCommands()).toHaveLength(1);
        expect(f.sockets()).toBe(2);
      });
    }
