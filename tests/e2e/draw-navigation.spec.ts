import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { drawFixture, drawStroke, assertDrawLayout } from './draw-fixture';
import { closeUndercoverFixture } from './undercover-fixture';
test.afterEach(async ({ page }) => {
  await closeUndercoverFixture(page);
});
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390])
      test.describe(() => {
        test.use({ hasTouch: width <= 760, isMobile: width <= 760 });
        test(`${skin.id} ${mode} ${width} 入口与独立窗口`, async ({ page }) => {
          test.setTimeout(60000);
          await page.setViewportSize({ width, height: 900 });
          await page.addInitScript(
            ({ skin, mode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', mode);
            },
            { skin: skin.id, mode },
          );
          const fixture = await drawFixture(page);
          fixture.releaseFirstLoad();
          fixture.state.delay = 0;
          await page.goto('/discover/games');
          await page.getByRole('button', { name: '打开你画我猜', exact: true }).click();
          await expect(page).toHaveURL('/game/draw');
          await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
          fixture.state.empty = false;
          fixture.state.room.participants[0]!.userId = '789';
          await page.getByRole('button', { name: '刷新房间', exact: true }).click();
          await page.getByRole('button', { name: '加入房间', exact: true }).click();
          await expect(page).toHaveURL(/synthetic-draw$/);
          await expect(page.getByRole('button', { name: '退出房间', exact: true })).toBeVisible();
          await assertDrawLayout(page, width);
          await page.getByRole('button', { name: '房间列表', exact: true }).click();
          await expect(page).toHaveURL('/game/draw');
          await page.goto('/discover/games');
          await expect(
            page.getByRole('button', { name: '你画我猜 再玩一次', exact: true }),
          ).toBeVisible();
          await page.getByRole('button', { name: '独立窗口打开你画我猜', exact: true }).click();
          const win = page.getByRole('dialog', { name: '你画我猜', exact: true });
          await expect(win).toBeVisible();
          await win.getByRole('button', { name: '查看房间', exact: true }).click();
          await win.getByRole('button', { name: '开始游戏', exact: true }).click();
          await expect(win.getByText('你的题目：苹果', { exact: true })).toBeVisible();
          await drawStroke(page, width < 760);
          const snapshot = () =>
            win.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
          const bitmap = await snapshot();
          const draft = win.getByRole('textbox', { name: '房间聊天' });
          await draft.fill('画家在保存前发言');
          await win.getByRole('button', { name: '发送', exact: true }).click();
          await expect(win.getByRole('region', { name: '聊天室消息' })).toContainText(
            '画家在保存前发言',
          );
          expect(fixture.state.messagesSent).toEqual(['画家在保存前发言']);
          await draft.fill('浮窗保留草稿');
          await win.getByRole('button', { name: '收起游戏窗口', exact: true }).click();
          await expect(win).toBeHidden();
          await page.getByRole('button', { name: '继续你画我猜', exact: true }).click();
          await expect(draft).toHaveValue('浮窗保留草稿');
          expect(await snapshot()).toBe(bitmap);
          expect(fixture.state.saveRequests).toBe(0);
          const save = win.getByRole('button', { name: '保存', exact: true });
          await expect(save).toBeEnabled();
          await save.click();
          await expect(win.getByText('画作已保存', { exact: true })).toBeVisible();
          expect(fixture.state.saves).toEqual([bitmap]);
          expect(fixture.state.saveRequests).toBe(1);
          const region = win.getByRole('region', { name: '你画我猜内容', exact: true });
          await region.focus();
          await region.press('End');
          await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
          await assertDrawLayout(page, width);
          const gutter = await region.evaluate(
            (e) =>
              e.getBoundingClientRect().right -
              e.firstElementChild!.firstElementChild!.getBoundingClientRect().right,
          );
          expect(gutter).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
          await win.getByRole('button', { name: '关闭游戏窗口', exact: true }).click();
          await expect(win).toHaveCount(0);
          fixture.state.empty = true;
          await page.goto('/game/draw/synthetic-draw');
          await expect(page.getByRole('heading', { name: '房间已关闭或不存在' })).toBeVisible();
          await assertDrawLayout(page, width);
        });
      });
