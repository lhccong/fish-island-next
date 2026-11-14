import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { drawFixture, drawStroke, assertDrawLayout } from './draw-fixture';
import {
  selectValue,
  changeAppearance,
  closeUndercoverFixture,
  swipeUp,
} from './undercover-fixture';
test.use({ hasTouch: true });
test.afterEach(async ({ page }) => {
  await closeUndercoverFixture(page);
});
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width} 画室完整流程`, async ({ page }, info) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        const fixture = await drawFixture(page);
        await page.goto('/game/draw');
        await expect(page.getByRole('status').filter({ hasText: '正在同步房间' })).toBeVisible();
        fixture.releaseFirstLoad();
        await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
        await assertDrawLayout(page, width);
        fixture.state.delay = 0;
        fixture.state.fail = true;
        await page.getByRole('button', { name: '刷新房间', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('HTTP 503');
        fixture.state.fail = false;
        await page.getByRole('button', { name: '重试同步', exact: true }).click();
        fixture.releaseFirstLoad();
        await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
        await page.getByRole('button', { name: '创建房间', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '创建你画我猜房间' });
        await selectValue(page, '词库', '成语');
        await dialog.getByRole('combobox', { name: '游戏轮数', exact: true }).click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await expect(dialog.getByRole('combobox', { name: '游戏轮数' })).toBeFocused();
        await dialog.getByRole('combobox', { name: '绘画方式' }).click();
        await page.keyboard.press('Escape');
        await expect(dialog.getByRole('combobox', { name: '绘画方式' })).toBeFocused();
        fixture.state.actionFail = true;
        await dialog.getByRole('button', { name: '确认创建', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('合成操作失败');
        fixture.state.actionFail = false;
        await dialog.getByRole('button', { name: '确认创建', exact: true }).click();
        await expect(page).toHaveURL(/\/game\/draw\/synthetic-draw$/);
        await page.getByRole('button', { name: '开始游戏', exact: true }).click();
        await expect(page.getByText('你的题目：苹果', { exact: true })).toBeVisible();
        await selectValue(page, '画笔颜色', '海蓝');
        fixture.state.saveFail = true;
        await drawStroke(page, width < 760);
        await expect(page.getByRole('button', { name: '重试同步画作' })).toBeVisible();
        fixture.state.saveFail = false;
        await page.getByRole('button', { name: '重试同步画作' }).click();
        await expect(page.getByText('画作已同步', { exact: true })).toBeVisible();
        expect(fixture.state.saves).toHaveLength(1);
        const draft = page.getByRole('textbox', { name: '猜一猜画的是什么' });
        await draft.fill('保留的合成草稿');
        const bitmap = await page
          .locator('canvas')
          .evaluate((c: HTMLCanvasElement) => c.toDataURL());
        const calls = fixture.state.calls;
        const connections = fixture.connection.state.connected;
        await changeAppearance(
          page,
          skin.id === 'wps' ? '微信绿' : 'WPS 表格',
          mode === 'dark' ? 'light' : 'dark',
        );
        await expect(draft).toHaveValue('保留的合成草稿');
        expect(await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
          bitmap,
        );
        expect(fixture.state.calls).toBe(calls);
        expect(fixture.connection.state.connected).toBe(connections);
        await changeAppearance(page, skin.name, mode);
        const message = {
          type: 'draw',
          data: {
            message: {
              roomId: 'synthetic-draw',
              sender: { id: '456', name: '合成玩家' },
              content: '合成房间发言',
              timestamp: new Date().toISOString(),
            },
          },
        };
        fixture.connection.emit(message);
        fixture.connection.emit(message);
        await expect(page.getByText('合成房间发言', { exact: false })).toHaveCount(1);
        fixture.connection.emit({
          ...message,
          data: { message: { ...message.data.message, roomId: 'other', content: '其他画室发言' } },
        });
        await expect(page.getByText('其他画室发言')).toHaveCount(0);
        await page
          .getByRole('heading', { name: '合成画家的画室', exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: info.outputPath(`draw-top-${mode}-${width}.png`),
          fullPage: true,
        });
        await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
        await drawStroke(page, width < 760);
        await page.getByRole('button', { name: '撤销', exact: true }).click();
        await page.getByRole('button', { name: '清空画布', exact: true }).click();
        await expect.poll(() => fixture.state.saves.length).toBeGreaterThan(1);
        expect(fixture.state.maxSaves).toBe(1);
        await assertDrawLayout(page, width);
        if (skin.id === 'wechat')
          await page.screenshot({
            path: info.outputPath(`draw-${mode}-${width}.png`),
            fullPage: true,
          });
        await page.getByRole('button', { name: '下一轮', exact: true }).click();
        await expect(page.getByText('提示：水果', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: '画笔', exact: true })).toHaveCount(0);
        fixture.state.actionFail = true;
        await draft.fill('香蕉');
        await page.getByRole('button', { name: '提交猜词' }).click();
        await expect(draft).toHaveValue('香蕉');
        fixture.state.actionFail = false;
        await page.getByRole('button', { name: '提交猜词' }).click();
        await expect(page.getByText('还没猜中，再试试', { exact: true })).toBeVisible();
        fixture.state.guesses = Array.from({ length: 40 }, (_, i) => ({
          userId: '456',
          userName: '合成玩家',
          guessWord: `合成答案${i}`,
          isCorrect: false,
          guessTime: new Date(1700000000000 + i).toISOString(),
        }));
        fixture.refresh();
        const records = page.getByRole('region', { name: '猜词记录', exact: true });
        await expect(records.getByText('合成答案39', { exact: false })).toHaveCount(1);
        if (width < 760) await swipeUp(page, '猜词记录');
        else {
          await records.hover();
          await records.evaluate((e) => (e.scrollTop = e.scrollHeight));
        }
        await expect.poll(() => records.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
        const root = records.locator('..');
        const scrollbar = root.locator('[data-orientation="vertical"]');
        if (width < 760) await expect(scrollbar).toBeHidden();
        else await expect(scrollbar).toBeVisible();
        await draft.fill('苹果');
        await page.getByRole('button', { name: '提交猜词' }).click();
        await expect(page.getByText('猜对了！', { exact: true }).first()).toBeVisible();
        await page.getByRole('button', { name: '结束游戏', exact: true }).click();
        await page
          .getByRole('dialog', { name: '结束本局游戏？' })
          .getByRole('button', { name: '确认操作' })
          .click();
        await expect(page.getByText('答案：苹果', { exact: true })).toBeVisible();
        await expect(draft).toBeDisabled();
        await assertDrawLayout(page, width);
        await page.getByRole('button', { name: '退出房间', exact: true }).click();
        await page
          .getByRole('dialog', { name: '退出当前房间？' })
          .getByRole('button', { name: '确认操作' })
          .click();
        await expect(page).toHaveURL('/game/draw');
      });
    }
