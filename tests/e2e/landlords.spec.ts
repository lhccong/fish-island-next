import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { landlordsFixture } from './landlords-fixture';
import { changeAppearance, swipeUp } from './undercover-fixture';
test.use({ hasTouch: true });
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width} 斗地主流程`, async ({ page }, info) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        const fixture = await landlordsFixture(page);
        try {
          await page.goto('/game/landlords');
          await expect(page.getByRole('status').filter({ hasText: '正在同步牌桌' })).toBeVisible();
          await expect.poll(() => fixture.state.commands.includes('gameRoomList')).toBe(true);
          fixture.releaseRooms();
          await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
          if (skin.id === 'wechat')
            await page.screenshot({
              path: info.outputPath(`lobby-${mode}-${width}.png`),
              fullPage: true,
            });
          fixture.state.fail = true;
          await page.getByRole('button', { name: '同步房间', exact: true }).click();
          await expect(page.getByRole('alert')).toContainText('合成操作失败');
          fixture.state.fail = false;
          await page.getByRole('button', { name: '重试同步' }).click();
          await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
          await page.getByRole('button', { name: '创建房间', exact: true }).click();
          await expect(page).toHaveURL(/synthetic-table$/);
          await expect(page.getByRole('button', { name: '准备', exact: true })).toBeEnabled();
          await page.getByRole('button', { name: '准备', exact: true }).click();
          await expect(page.getByRole('button', { name: '开始游戏' })).toBeEnabled();
          await page.getByRole('button', { name: '开始游戏' }).click();
          await expect(page.getByText('轮到你叫分', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: '3 分', exact: true }).click();
          await expect(page.getByText('轮到你出牌', { exact: true })).toBeVisible();
          const card = page.getByRole('button', { name: '选择♠3', exact: true });
          await card.click();
          await expect(card).toHaveAttribute('aria-pressed', 'true');
          await card.focus();
          if (skin.id === 'wechat')
            await page.screenshot({
              path: info.outputPath(`selected-${mode}-${width}.png`),
              fullPage: true,
            });
          fixture.state.fail = true;
          await page.getByRole('button', { name: '出牌', exact: true }).click();
          await expect(page.getByRole('alert')).toContainText('合成操作失败');
          await expect(card).toHaveAttribute('aria-pressed', 'true');
          fixture.state.fail = false;
          const draft = page.getByRole('textbox', { name: '牌桌发言' });
          await draft.fill('保留合成草稿');
          const count = fixture.state.commands.length;
          await changeAppearance(
            page,
            skin.id === 'wps' ? '微信绿' : 'WPS 表格',
            mode === 'dark' ? 'light' : 'dark',
          );
          await expect(draft).toHaveValue('保留合成草稿');
          await expect(card).toHaveAttribute('aria-pressed', 'true');
          expect(fixture.state.commands.length).toBe(count);
          expect(fixture.state.connections).toBe(1);
          await changeAppearance(page, skin.name, mode);
          await page.getByRole('button', { name: '出牌', exact: true }).click();
          await expect(card).toHaveCount(0);
          await page.getByRole('button', { name: '不出', exact: true }).click();
          await page.getByRole('button', { name: '开启托管', exact: true }).click();
          await expect(page.getByRole('button', { name: '取消托管', exact: true })).toBeEnabled();
          await page.getByRole('button', { name: '取消托管', exact: true }).click();
          fixture.state.chatFail = true;
          await page.getByRole('button', { name: '发送', exact: true }).click();
          await expect(page.getByText('合成聊天失败', { exact: true })).toBeVisible();
          await expect(draft).toHaveValue('保留合成草稿');
          fixture.state.chatFail = false;
          await page.getByRole('button', { name: '发送', exact: true }).click();
          await expect(draft).toHaveValue('');
          for (let i = 0; i < 30; i++)
            fixture.emit('gameChat', { userName: '合成牌友', content: `合成发言${i}` });
          const log = page.getByRole('region', { name: '斗地主聊天记录' });
          expect(
            await log.evaluate((e) => parseFloat(getComputedStyle(e).paddingInlineEnd)),
          ).toBeGreaterThanOrEqual(width < 760 ? 20 : 24);
          if (width < 760) await swipeUp(page, '斗地主聊天记录');
          else {
            await log.hover();
            await log.evaluate((e) => (e.scrollTop = e.scrollHeight));
          }
          await expect.poll(() => log.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
          const scrollbar = log.locator('..').locator('[data-orientation="vertical"]');
          if (width < 760) await expect(scrollbar).toBeHidden();
          else await expect(scrollbar).toBeVisible();
          expect(
            await page
              .locator('main')
              .evaluateAll((nodes) => nodes.every((n) => n.scrollWidth <= n.clientWidth + 1)),
          ).toBe(true);
          expect(
            await page
              .getByRole('region', { name: '我的手牌' })
              .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
          ).toBe(true);
          if (width < 760)
            expect(
              await page
                .getByRole('region', { name: '我的手牌' })
                .getByRole('button', { name: /^选择/ })
                .evaluateAll((nodes) =>
                  nodes.every((n) => {
                    const r = n.getBoundingClientRect();
                    return r.width >= 44 && r.height >= 44;
                  }),
                ),
            ).toBe(true);
          await page
            .getByRole('heading', { name: '房间 synthetic-table', exact: true })
            .scrollIntoViewIfNeeded();
          if (skin.id === 'wechat')
            await page.screenshot({
              path: info.outputPath(`table-${mode}-${width}.png`),
              fullPage: true,
            });
          fixture.emit('gameActionResult', {
            event: 'GAME_OVER',
            message: '合成对局结束',
            players: [{ userId: '123', userName: '合成牌友1', isWinner: true, scoreChange: 2 }],
          });
          await expect(page.getByRole('heading', { name: '合成对局结束' })).toBeVisible();
          await page.getByRole('button', { name: '离开房间', exact: true }).click();
          await page.getByRole('button', { name: '确认离开', exact: true }).click();
          await expect(page).toHaveURL('/game/landlords');
          await page.getByRole('button', { name: '排行榜', exact: true }).click();
          await expect(page.getByText('1 · 合成榜单1', { exact: true })).toBeVisible();
          const ranks = page.getByRole('region', { name: '斗地主排行榜', exact: true });
          expect(
            await ranks.evaluate((e) => parseFloat(getComputedStyle(e).paddingInlineEnd)),
          ).toBeGreaterThanOrEqual(width < 760 ? 20 : 24);
          await ranks.evaluate((e) => (e.scrollTop = e.scrollHeight));
          await expect(page.getByText('50 · 合成榜单50', { exact: true })).toBeInViewport();
          expect(await ranks.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
          await page.getByRole('combobox', { name: '排行排序' }).click();
          await page.keyboard.press('End');
          await page.keyboard.press('Enter');
          await expect(page.getByRole('combobox', { name: '排行排序' })).toBeFocused();
          await page.getByRole('combobox', { name: '排行排序' }).click();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('combobox', { name: '排行排序' })).toBeFocused();
          await page.getByRole('button', { name: '关闭排行榜' }).click();
          await page.getByRole('button', { name: '通过房号加入', exact: true }).click();
          const join = page.getByRole('dialog', { name: '加入斗地主房间' });
          expect(
            await join
              .getByRole('region', { name: '加入房间表单' })
              .evaluate((e) => parseFloat(getComputedStyle(e).paddingInlineEnd)),
          ).toBeGreaterThanOrEqual(width < 760 ? 20 : 24);
          await join.getByRole('textbox', { name: '房号', exact: true }).fill('synthetic-table');
          fixture.state.fail = true;
          await join.getByRole('button', { name: '加入房间', exact: true }).click();
          await expect(join.getByRole('alert')).toContainText('合成操作失败');
          await expect(join.getByRole('textbox', { name: '房号', exact: true })).toHaveValue(
            'synthetic-table',
          );
          fixture.state.fail = false;
          await join.getByRole('button', { name: '加入房间', exact: true }).click();
          await expect(page).toHaveURL(/synthetic-table$/);
          await page.goto('/discover/games');
          const launch = page.getByRole('button', { name: '独立窗口打开斗地主', exact: true });
          await launch.scrollIntoViewIfNeeded();
          if (width < 760) await launch.tap();
          else await launch.click();
          const win = page.getByRole('dialog', { name: '斗地主', exact: true });
          await expect(win.getByRole('button', { name: '创建房间', exact: true })).toBeEnabled();
          expect(await win.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
          await win.getByRole('button', { name: '关闭游戏窗口', exact: true }).click();
        } finally {
          await fixture.close();
        }
      });
    }
