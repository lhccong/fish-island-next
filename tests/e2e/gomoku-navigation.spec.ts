import { expect, test } from '@playwright/test';
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

test('public chat renders the old invitation as a route link, and unanswered room requests time out', async ({
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
      content: '[invite/chess]invite-room[/invite]',
      sender: { id: '202', name: '合成岛友' },
      timestamp: 1794654000000,
    },
  });
  await page.getByRole('link', { name: '加入五子棋房间 invite-room', exact: true }).click();
  await expect
    .poll(
      () => f.commands.filter((command) => command.data?.type === 'joinRoom').at(-1)?.data?.content,
    )
    .toBe('invite-room');
  f.joined('white', 'invite-room');
  await expect(page.getByRole('region', { name: '房间信息' })).toContainText('invite-room');
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
