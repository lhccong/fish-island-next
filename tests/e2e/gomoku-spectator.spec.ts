import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { act, assertLayout, scrollRegion, setupGomoku } from './gomoku-fixture';

const roomId = 'g-synthetic';
const players = {
  black: { name: '合成黑方棋手' },
  white: { name: '合成白方棋手' },
};
const moves = Array.from({ length: 9 }, (_, index) => ({
  row: index % 2 === 0 ? 7 : 8,
  col: Math.floor(index / 2),
  player: index % 2 === 0 ? 'black' : 'white',
}));

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: read-only spectator view, retry and live moves`, async ({
        page,
      }, info) => {
        const f = await setupGomoku(page, skin.id, mode, width);
        await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
        await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
        await expect(page.getByRole('button', { name: '工作时间设置' })).toHaveCount(0);
        const watch = page.getByRole('button', { name: '进入观战', exact: true });
        const room = page.getByRole('textbox', { name: '房间号', exact: true });
        await expect(watch).toBeDisabled();
        await room.fill(roomId);
        await expect(watch).toBeEnabled();
        if (width > 760) await watch.hover();
        await watch.focus();
        await expect(watch).toBeFocused();
        expect((await watch.boundingBox())!.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 32);
        await act(page, '进入观战', width);
        await expect(page.getByText('正在加载观战棋谱…')).toBeVisible();
        await expect(watch).toBeDisabled();
        await assertLayout(page, width);
        const watchCommands = () =>
          f.commands.filter((command) => command.data?.type === 'watchChess');
        await expect.poll(() => watchCommands().length).toBe(1);
        const first = watchCommands()[0]!.data!.content as { roomId: string; requestId: string };
        expect(first.roomId).toBe(roomId);
        f.send('chessWatchError', { ...first, message: '对局尚未开始，请稍后重试。' });
        await expect(page.getByRole('alert')).toContainText('对局尚未开始');
        await expect(room).toHaveValue(roomId);
        await assertLayout(page, width);
        await act(page, '进入观战', width);
        await expect.poll(() => watchCommands().length).toBe(2);
        const second = watchCommands()[1]!.data!.content as { roomId: string; requestId: string };
        f.send('chessWatched', { ...first, ...players, moves: [moves[0]] });
        f.send('chessWatched', { ...second, ...players, moves: [] });
        const board = page.getByRole('grid', { name: '五子棋棋盘' });
        await expect(board).toHaveAttribute('aria-readonly', 'true');
        await expect(page.getByText('尚未落子', { exact: true })).toBeVisible();
        await expect(page.getByText(players.black.name, { exact: true })).toBeVisible();
        await expect(page.getByText(players.white.name, { exact: true })).toBeVisible();
        await assertLayout(page, width);
        const center = board.locator('[data-point="7-7"]');
        await center.focus();
        await center.press('ArrowRight');
        const next = board.locator('[data-point="7-8"]');
        await expect(next).toBeFocused();
        await next.press('Enter');
        if (width <= 760) await next.tap({ force: true });
        else await next.click({ force: true });
        await expect(next).toHaveAttribute('aria-disabled', 'true');
        await expect(next).toHaveAttribute('data-stone', 'empty');
        expect(f.commands.some((command) => command.data?.type === 'moveChess')).toBe(false);

        const history = page.getByRole('region', { name: '对局棋谱' });
        if (width <= 760) {
          const chat = page.getByRole('region', { name: '公共聊天室', exact: true });
          expect((await history.boundingBox())!.y).toBeLessThan((await chat.boundingBox())!.y);
        }
        for (const [index, move] of moves.entries())
          f.send('chessWatchMove', { roomId, number: index + 1, move });
        await expect(history.getByRole('listitem')).toHaveCount(9);
        await expect(page.getByText('黑棋获胜', { exact: false })).toBeVisible();
        await expect(board.locator('[data-win="true"]')).toHaveCount(5);
        await assertLayout(page, width);
        if (skin.id === 'wechat' && width !== 375) {
          await board.scrollIntoViewIfNeeded();
          await page.screenshot({ path: info.outputPath('spectator.png') });
        }
        await scrollRegion(page, history, width);
        await expect.poll(() => history.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        await expect(history.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
          'visibility',
          width <= 760 ? 'hidden' : 'visible',
        );
        const gutter = await history.evaluate((node) => ({
          end: parseFloat(getComputedStyle(node).paddingInlineEnd),
          inner: node.clientWidth,
          content: node.scrollWidth,
        }));
        expect(gutter.end).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        expect(gutter.content).toBeLessThanOrEqual(gutter.inner);
        f.send('chessRoomClosed', { roomId });
        await expect(page.getByText('棋手已离开房间。')).toBeVisible();
        await act(page, '退出观战', width);
        await expect(watch).toBeVisible();
        expect(f.commands.filter((command) => command.data?.type === 'joinRoom')).toHaveLength(0);
        expect(f.sockets()).toBe(1);
      });
    }

test('opens a copied watch link midgame and preserves the board when appearance changes', async ({
  page,
  browser,
}) => {
  const f = await setupGomoku(page, 'wechat', 'light', 1440);
  await act(page, '创建联机房间', 1440);
  f.send('createChessRoom', { roomId, spectatable: true });
  await expect(page.getByRole('region', { name: '房间信息' })).toContainText(roomId);
  f.send('joinSuccess', { roomId, spectatable: true, yourColor: 'black', playerId: '202' });
  await act(page, '复制观战链接', 1440);
  const url = await page.evaluate(() => sessionStorage.getItem('synthetic-copy'));
  expect(new URL(url!).search).toBe(`?roomId=${roomId}&mode=spectator`);
  await page.evaluate((target) => {
    history.pushState(history.state, '', target);
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }, url!);
  await expect(page).toHaveURL('/game/piece');
  await expect(page.getByRole('grid')).toHaveAttribute('aria-readonly', 'false');
  expect(f.commands.some((command) => command.data?.type === 'leaveChessRoom')).toBe(false);
  const context = await browser.newContext({ baseURL: new URL(url!).origin });
  try {
    const spectator = await context.newPage();
    const watching = await setupGomoku(spectator, 'wechat', 'light', 1440, '303');
    await spectator.goto(url!);
    const watchCommands = () =>
      watching.commands.filter((command) => command.data?.type === 'watchChess');
    await expect.poll(() => watchCommands().length).toBe(1);
    const request = watchCommands()[0]!.data!.content as { roomId: string; requestId: string };
    watching.send('chessWatched', { ...request, ...players, moves: moves.slice(0, 2) });
    const board = spectator.getByRole('grid', { name: '五子棋棋盘' });
    await expect(board.locator('[data-point="8-0"]')).toHaveAttribute('data-stone', 'white');
    await spectator.getByRole('button', { name: '切换主题', exact: true }).click();
    const dialog = spectator.getByRole('dialog', { name: '主题模式' });
    await dialog.getByRole('button', { name: 'WPS 表格', exact: true }).click();
    await dialog.getByRole('button', { name: '暗夜模式', exact: true }).click();
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(board.locator('[data-point="8-0"]')).toHaveAttribute('data-stone', 'white');
    expect(watchCommands()).toHaveLength(1);
    expect(watching.sockets()).toBe(2);
    watching.send('chessRoomClosed', { roomId });
    await expect(spectator.getByRole('alert')).toContainText('棋手已离开，观战结束');
    await act(spectator, '退出观战', 1440);
    await expect(spectator.getByRole('button', { name: '进入观战', exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
