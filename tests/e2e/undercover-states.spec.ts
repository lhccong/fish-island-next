import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import {
  undercoverFixture,
  assertUndercoverLayout,
  selectValue,
  swipeUp,
  closeUndercoverFixture,
} from './undercover-fixture';
test.use({ hasTouch: true });
test.afterEach(async ({ page }) => {
  await closeUndercoverFixture(page);
});
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width} 加入退出、控件与滚动`, async ({ page }, info) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 600 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        const fixture = await undercoverFixture(page);
        await fixture.login();
        await selectValue(page, '玩家人数', '20 人');
        await selectValue(page, '卧底人数', '9 人');
        await page
          .getByRole('textbox', { name: '玩家20昵称', exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          page.getByRole('textbox', { name: '玩家20昵称', exact: true }),
        ).toBeInViewport();
        await selectValue(page, '玩家人数', '3 人');
        await expect(page.getByRole('combobox', { name: '卧底人数' })).toContainText('1 人');
        await page.getByRole('textbox', { name: '玩家2昵称', exact: true }).fill('玩家1');
        await page.getByRole('button', { name: '开始发牌' }).click();
        await expect(page.getByRole('alert')).toContainText('不能重复');
        if (skin.id === 'wechat')
          await page.screenshot({
            path: info.outputPath(`local-${mode}-${width}.png`),
            fullPage: true,
          });
        await page.getByRole('button', { name: '联机房间', exact: true }).click();
        await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
        const create = page.getByRole('button', { name: '创建房间', exact: true });
        await create.click();
        const dialog = page.getByRole('dialog', { name: '创建联机房间' });
        const body = dialog.getByRole('region', { name: '房间设置' });
        await body.hover();
        const scroll = await body.evaluate((e) => {
          const content = e.firstElementChild!.firstElementChild!;
          const track = e.parentElement!.querySelector('[data-orientation="vertical"]');
          return {
            gap: e.getBoundingClientRect().right - content.getBoundingClientRect().right,
            overflow: e.scrollWidth > e.clientWidth,
            height: e.scrollHeight - e.clientHeight,
            track: track ? getComputedStyle(track).visibility : 'hidden',
          };
        });
        expect(scroll.overflow).toBe(false);
        expect(scroll.gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        if (width <= 760) expect(scroll.track).toBe('hidden');
        await body.evaluate((e) => {
          e.scrollTop = e.scrollHeight;
        });
        await dialog.getByRole('combobox', { name: '本轮时长' }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('listbox')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog.getByRole('combobox', { name: '本轮时长' })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(create).toBeFocused();
        fixture.state.phase = 'ready';
        fixture.state.room.creatorId = '456';
        fixture.state.room.participants = fixture.state.room.participants.filter(
          (p) => p.userId !== '123',
        );
        await page.getByRole('textbox', { name: '房间号', exact: true }).fill('synthetic-room');
        await page.getByRole('button', { name: '查找房间', exact: true }).click();
        await expect(page.getByRole('button', { name: '加入房间', exact: true })).toBeVisible();
        fixture.state.actionFail = true;
        await page.getByRole('button', { name: '加入房间', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('合成操作失败');
        fixture.state.actionFail = false;
        fixture.state.room.participants.push({
          userId: '123',
          userName: '合成玩家1',
          isEliminated: false,
          voteCount: 0,
          remainingGuessCount: 3,
        });
        await page.getByRole('button', { name: '加入房间', exact: true }).click();
        await expect(page.getByRole('button', { name: '退出房间', exact: true })).toBeVisible();
        const draft = page.getByRole('textbox', { name: '房间发言内容' });
        await draft.fill('输入法组合中的内容');
        const before = fixture.state.sends.length;
        await draft.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
        expect(fixture.state.sends.length).toBe(before);
        await expect(draft).toHaveValue('输入法组合中的内容');
        for (let i = 0; i < 35; i++)
          fixture.emit({
            type: 'undercover',
            data: {
              message: {
                id: `scroll-${i}`,
                roomId: 'synthetic-room',
                content: `合成消息${i}：${'长文本'.repeat(10)}`,
                timestamp: new Date().toISOString(),
                sender: { id: '456', name: '合成玩家2' },
              },
            },
          });
        await expect(page.getByText(/^合成消息34：/)).toBeVisible();
        const history = page.getByRole('region', { name: '房间发言记录' });
        await history.hover();
        await history.evaluate((e) => {
          e.scrollTop = 0;
        });
        if (width <= 760) await swipeUp(page, '房间发言记录');
        await history.focus();
        await page.keyboard.press('End');
        await expect
          .poll(() => history.evaluate((e) => e.scrollHeight - e.clientHeight - e.scrollTop))
          .toBeLessThanOrEqual(1);
        await history.evaluate((e) => {
          e.scrollTop = 0;
        });
        await expect.poll(() => history.evaluate((e) => e.scrollTop)).toBe(0);
        fixture.emit({
          type: 'undercover',
          data: {
            message: {
              id: 'last',
              roomId: 'synthetic-room',
              content: '新增消息不抢滚动',
              timestamp: new Date().toISOString(),
              sender: { id: '456', name: '合成玩家2' },
            },
          },
        });
        await expect(page.getByRole('button', { name: '查看新发言' })).toBeVisible();
        expect(await history.evaluate((e) => e.scrollTop)).toBe(0);
        await page.getByRole('button', { name: '查看新发言' }).click();
        await expect(page.getByText('新增消息不抢滚动', { exact: true })).toBeVisible();
        const gutter = await history.evaluate((e) => {
          const child = e.firstElementChild!.firstElementChild!;
          const track = e.parentElement!.querySelector('[data-orientation="vertical"]');
          return {
            gap: e.getBoundingClientRect().right - child.getBoundingClientRect().right,
            hidden: track ? getComputedStyle(track).visibility === 'hidden' : true,
            opacity: track ? getComputedStyle(track).opacity : '0',
          };
        });
        expect(gutter.gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        if (width <= 760) expect(gutter.hidden).toBe(true);
        else {
          expect(gutter.hidden).toBe(false);
          expect(Number(gutter.opacity)).toBeGreaterThan(0);
        }
        await assertUndercoverLayout(page, width);
        if (skin.id === 'wechat')
          await page.screenshot({
            path: info.outputPath(`room-${mode}-${width}.png`),
            fullPage: true,
          });
        await page.getByRole('button', { name: '退出房间', exact: true }).click();
        await page
          .getByRole('dialog', { name: '退出房间？' })
          .getByRole('button', { name: '确认', exact: true })
          .click();
        await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
        expect(fixture.state.actions.filter((a) => a === 'room/join')).toHaveLength(2);
        await page.getByRole('link', { name: '返回游戏', exact: true }).click();
        await page.getByRole('button', { name: '独立窗口打开谁是卧底', exact: true }).click();
        const window = page.getByRole('dialog', { name: '谁是卧底', exact: true });
        await expect(window.getByRole('button', { name: '开始发牌', exact: true })).toBeVisible({
          timeout: 30000,
        });
        await window.getByRole('button', { name: '开始发牌', exact: true }).click();
        await expect(window.getByRole('button', { name: '我是玩家1，查看词语' })).toBeVisible();
        await window.getByRole('button', { name: '收起游戏窗口' }).click();
        await page.getByRole('button', { name: '继续谁是卧底' }).click();
        await expect(window.getByRole('button', { name: '我是玩家1，查看词语' })).toBeVisible();
        await window.getByRole('button', { name: '关闭游戏窗口' }).click();
        await expect(window).toHaveCount(0);
      });
    }
