import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow } from './fish-circle-fixture';

test.setTimeout(60_000);

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: anchored menu, actions and feed states`, async ({ page }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      const state = await setup(page);
      const more = page.getByRole('button', { name: '更多动态操作' });
      const menu = page.getByRole('menu', { name: '动态操作' });
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await more.click();
      await expect(menu).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(menu.getByRole('menuitem')).toHaveText(['发起抽奖', '置顶动态', '修改', '删除']);
      const box = (await menu.boundingBox())!;
      const anchor = (await more.boundingBox())!;
      expect(box.width).toBeLessThan(180);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      expect(Math.abs(box.x + box.width - anchor.x - anchor.width)).toBeLessThanOrEqual(8);
      if (page.viewportSize()!.width <= 760) {
        expect(
          (await menu.getByRole('menuitem').first().boundingBox())!.height,
        ).toBeGreaterThanOrEqual(44);
      }
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('menu.png') });
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(more).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(menu.getByRole('menuitem', { name: '发起抽奖' })).toBeFocused();
      await page.keyboard.press('End');
      await expect(menu.getByRole('menuitem', { name: '删除', exact: true })).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(menu.getByRole('menuitem', { name: '修改', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      const editor = page.getByRole('dialog', { name: '编辑动态' });
      await expect(editor).toBeVisible();
      await expect
        .poll(() => editor.evaluate((element) => element.contains(document.activeElement)))
        .toBe(true);
      await editor.getByRole('button', { name: '关闭编辑器' }).click();
      await expect(more).toBeFocused();
      await more.click();
      await page.getByRole('article').getByText('今天在岛上看海', { exact: true }).click();
      await expect(menu).toHaveCount(0);
      state.mutationFailure = true;
      await more.click();
      await menu.getByRole('menuitem', { name: '置顶动态', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('合成操作失败');
      await expect(more).toBeEnabled();
      state.mutationFailure = false;
      await more.click();
      await menu.getByRole('menuitem', { name: '置顶动态', exact: true }).click();
      await expect(page.getByRole('article')).toHaveAttribute('data-pinned', 'true');
      await more.click();
      await expect(menu.getByRole('menuitem', { name: '取消置顶' })).toBeVisible();
      await page.keyboard.press('Escape');
      state.delay = 300;
      await page.getByRole('button', { name: '刷新动态' }).click();
      await expect(page.getByText('正在加载鱼小圈…')).toBeVisible();
      await expect(menu).toHaveCount(0);
      await noOverflow(page);
      await expect(more).toBeVisible();
      state.delay = 0;
      state.fail = true;
      await page.getByRole('button', { name: '刷新动态' }).click();
      await expect(page.getByRole('alert')).toContainText('503');
      await noOverflow(page);
      state.fail = false;
      state.empty = true;
      await page.getByRole('button', { name: '重试动态' }).click();
      await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await expect(menu).toHaveCount(0);
      await expect(more).toHaveCount(0);
      await noOverflow(page);
    });
  }
}
