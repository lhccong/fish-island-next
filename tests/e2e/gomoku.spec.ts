import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { act, assertLayout, playPoint, scrollRegion, setupGomoku } from './gomoku-fixture';

test.setTimeout(180_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: room, errors, invitation, turns, win, keyboard and touch`, async ({
        page,
      }, info) => {
        const f = await setupGomoku(page, skin.id, mode, width);
        await expect(page.getByText('还没有新消息，和岛友打个招呼吧。')).toBeAttached();
        await assertLayout(page, width);
        await page.screenshot({ path: info.outputPath('lobby.png') });
        await act(page, '创建联机房间', width);
        await expect(page.getByText('正在创建房间…', { exact: true })).toBeVisible();
        f.send('error', '合成建房失败，请重试');
        await expect(page.getByRole('alert')).toContainText('合成建房失败');
        await act(page, '创建联机房间', width);
        await expect
          .poll(
            () => f.commands.filter((command) => command.data?.type === 'createChessRoom').length,
          )
          .toBe(2);
        f.created();
        await expect(
          page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
        ).toContainText('等待岛友加入');
        await assertLayout(page, width);
        if (width > 760) {
          const room = await page.getByRole('region', { name: '房间信息' }).boundingBox();
          const board = await page.getByRole('grid').boundingBox();
          const chat = await page
            .getByRole('region', { name: '公共聊天室', exact: true })
            .boundingBox();
          expect(room!.y + room!.height).toBeLessThanOrEqual(board!.y);
          expect(chat!.x).toBeGreaterThan(board!.x + board!.width);
          expect(chat!.height).toBeLessThanOrEqual(340);
        }
        await act(page, '复制邀请链接', width);
        expect(await page.evaluate(() => sessionStorage.getItem('synthetic-copy'))).toContain(
          '/game/piece?roomId=room-123&mode=online',
        );
        f.failSend(true);
        await act(page, '邀请聊天室岛友', width);
        await expect(page.getByText('合成发送失败', { exact: true })).toBeVisible();
        f.failSend(false);
        await act(page, '邀请聊天室岛友', width);
        await expect(page.getByText('邀请已发送到公共聊天室', { exact: true })).toBeVisible();
        await act(page, '邀请聊天室岛友', width);
        await expect(page.getByText('邀请已发出，请等待 60 秒后再发送。')).toBeVisible();
        f.joined();
        await expect(
          page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
        ).toContainText('轮到你落子');
        const center = page.locator('[data-point="7-7"]');
        await center.focus();
        await center.press('ArrowLeft');
        await expect(page.locator('[data-point="7-6"]')).toBeFocused();
        await page.locator('[data-point="7-6"]').press('Enter');
        await expect(page.locator('[data-point="7-6"]')).toHaveAttribute('data-stone', 'black');
        f.move(8, 6);
        await expect(
          page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
        ).toContainText('轮到你落子');
        for (let col = 0; col < 5; col++) {
          await playPoint(page, 7, col, width);
          if (col < 4) {
            await expect(page.locator('[data-point="0-0"]')).toHaveAttribute(
              'aria-disabled',
              'true',
            );
            f.move(8, col, 'white', 'old-room');
            f.move(8, col);
            f.move(8, col);
            await expect(
              page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
            ).toContainText('轮到你落子');
          }
          await assertLayout(page, width);
        }
        await expect(
          page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
        ).toContainText('黑棋获胜 · 你赢了！');
        await expect(page.locator('[data-win="true"]')).toHaveCount(5);
        expect(f.commands.filter((command) => command.data?.type === 'moveChess')).toHaveLength(6);
        expect(f.sockets()).toBe(1);
        await page.getByRole('grid').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('win.png') });
        const history = page.getByRole('region', { name: '对局棋谱' });
        await scrollRegion(page, history, width);
        await expect.poll(() => history.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        const gutter = await history.evaluate((node) => ({
          end: parseFloat(getComputedStyle(node).paddingInlineEnd),
          width: node.clientWidth,
          content:
            node.querySelector('ol')!.getBoundingClientRect().right -
            node.getBoundingClientRect().left,
        }));
        expect(gutter.end).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        expect(gutter.width - gutter.content).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        const rail = history.locator('..').locator('[data-orientation="vertical"]');
        await expect(rail).toHaveCSS('visibility', width <= 760 ? 'hidden' : 'visible');
        await act(page, '退出房间', width);
        await expect(page.getByRole('dialog', { name: '退出当前房间？' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '退出房间', exact: true })).toBeFocused();
        await act(page, '退出房间', width);
        await act(page, '确认退出', width);
        await expect(page.getByRole('button', { name: '创建联机房间', exact: true })).toBeVisible();
        f.move(1, 1);
        await assertLayout(page, width);
        await page.getByLabel('房间号', { exact: true }).fill('missing');
        await act(page, '加入房间', width);
        await expect(page.getByText('正在加入房间…', { exact: true })).toBeVisible();
        f.send('error', '房间不存在或已开始');
        await expect(page.getByRole('alert')).toContainText('房间不存在或已开始');
        await page.getByLabel('房间号', { exact: true }).fill('room-white');
        await act(page, '加入房间', width);
        f.joined('white', 'room-white');
        await expect(
          page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
        ).toContainText('等待对方落子');
        f.move(7, 7, 'black', 'room-white');
        await expect(
          page.getByRole('region', { name: '当前对局' }).getByRole('status').first(),
        ).toContainText('轮到你落子');
        await playPoint(page, 8, 7, width);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '主题模式' });
        await dialog
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await dialog
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await dialog.getByRole('button', { name: '关闭', exact: true }).click();
        await expect(page.getByText('第 2 手 · 最近落子 H7', { exact: true })).toBeVisible();
        expect(f.sockets()).toBe(1);
        expect(
          f.commands.filter((command) =>
            ['createChessRoom', 'joinRoom'].includes(command.data?.type ?? ''),
          ),
        ).toHaveLength(4);
        await page.setViewportSize({ width, height: 900 });
        f.disconnect();
        await expect(page.getByRole('alert')).toContainText('当前棋局无法恢复');
        await expect(page.locator('[data-point="0-0"]')).toHaveAttribute('aria-disabled', 'true');
        await assertLayout(page, width);
        await act(page, '返回大厅', width);
        await act(page, '执白后手', width);
        await expect(page.locator('[data-point="7-7"]')).toHaveAttribute('data-stone', 'black');
        await playPoint(page, 8, 8, width);
        await expect(page.locator('[data-point="8-8"]')).toHaveAttribute('data-stone', 'white');
        const chat = page.getByRole('region', { name: '公共聊天室', exact: true });
        await expect(page.getByRole('status', { name: '五子棋连接状态' })).toHaveText('联机已连接');
        for (let n = 0; n < 40; n++) f.chat(n);
        await expect(chat.locator('li')).toHaveCount(30);
        await expect(chat.getByText('合成消息 0', { exact: true })).toHaveCount(0);
        const chatViewport = page.getByRole('region', { name: '游戏中的公共聊天消息' });
        await chatViewport.evaluate((node) => {
          node.scrollTop = 0;
        });
        await scrollRegion(page, chatViewport, width);
        await expect.poll(() => chatViewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        f.failSend(true);
        await chat
          .getByRole('textbox', { name: '公共聊天消息', exact: true })
          .fill('合成公共聊天内容');
        await act(page, '发送', width);
        await expect(chat.getByRole('alert')).toContainText('合成发送失败');
        await expect(chat.getByRole('textbox', { name: '公共聊天消息', exact: true })).toHaveValue(
          '合成公共聊天内容',
        );
        f.failSend(false);
        await act(page, '发送', width);
        await expect(chat.getByRole('textbox', { name: '公共聊天消息', exact: true })).toHaveValue(
          '',
        );
        await expect(chat.locator('li').filter({ hasText: '合成公共聊天内容' })).toHaveCount(1);
        await assertLayout(page, width);
        const sockets = f.sockets();
        await act(page, '独立窗口打开五子棋', width);
        const win = page.getByRole('dialog', { name: '五子棋', exact: true });
        await expect(win.locator('[data-point="8-8"]')).toHaveAttribute('data-stone', 'white');
        const content = win.getByRole('region', { name: '五子棋内容', exact: true });
        expect(await content.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
        await win.getByRole('button', { name: '收起游戏窗口', exact: true }).click();
        await expect(win).toBeHidden();
        await act(page, '继续五子棋', width);
        await expect(win.locator('[data-point="8-8"]')).toHaveAttribute('data-stone', 'white');
        await win.getByRole('button', { name: '关闭游戏窗口', exact: true }).click();
        await expect(win).toHaveCount(0);
        expect(f.sockets()).toBe(sockets);
        await page.getByRole('link', { name: '返回游戏', exact: true }).click();
        await act(page, '打开五子棋', width);
        await expect(page.locator('[data-point="8-8"]')).toHaveAttribute('data-stone', 'white');
        expect(f.sockets()).toBe(sockets);
      });
    }
