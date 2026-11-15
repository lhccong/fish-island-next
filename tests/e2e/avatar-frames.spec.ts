import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture, releaseFrameFixture } from './avatar-frames-fixture';
import { assertArea } from './sign-in-layout';

test.afterEach(({ page }) => releaseFrameFixture(page));

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport, isMobile: viewport.width < 760, hasTouch: viewport.width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 头像框加载、分页、兑换与穿戴`, async ({ page }, info) => {
          const state = await frameFixture(page, skin.id, mode);
          await page.goto('/chat');
          await expect(page.getByText('头像框历史消息', { exact: true })).toBeVisible();
          await expect(page.locator('[aria-label="聊天列表"] [data-avatar-frame]')).toHaveCount(0);
          await expect(
            page.locator('[data-message-avatar] [data-avatar-frame] img'),
          ).toHaveAttribute('src', 'https://frame.test/1.svg');
          const editor = page.getByRole('textbox', { name: /消息输入/ });
          if (await editor.count()) await editor.fill('保留头像框草稿');
          const open = async () => {
            if (
              viewport.width < 760 &&
              (await page.getByRole('link', { name: '返回热榜', exact: true }).count())
            )
              await page.getByRole('link', { name: '返回热榜', exact: true }).click();
            await page.getByRole('button', { name: '用户菜单', exact: true }).click();
            await page.getByRole('menuitem', { name: '头像框', exact: true }).click();
          };
          await open();
          const dialog = page.getByRole('dialog', { name: '头像框', exact: true });
          const scroll = dialog.getByRole('region', { name: '头像框列表' });
          await expect(dialog.getByText('正在加载头像框…')).toBeVisible();
          await assertArea(scroll, viewport.width < 760);
          state.catalog = 'error';
          state.release();
          await expect(dialog.getByRole('alert')).toContainText('头像框暂不可用');
          state.catalog = 'empty';
          await dialog.getByRole('button', { name: '重新读取' }).click();
          await expect(dialog.getByText('暂无可兑换的头像框')).toBeVisible();
          await assertArea(scroll, viewport.width < 760);
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(page.getByRole('button', { name: '用户菜单', exact: true })).toBeFocused();
          state.catalog = 'ready';
          await open();
          const first = dialog
            .getByRole('article')
            .filter({ has: page.getByRole('heading', { name: '海风头像框 1', exact: true }) });
          await expect(first).toBeVisible();
          await expect(
            dialog
              .getByRole('article')
              .filter({ hasText: '海风头像框 3' })
              .getByRole('button', { name: '积分不足' }),
          ).toBeDisabled();
          await assertArea(scroll, viewport.width < 760);
          await page.screenshot({ path: info.outputPath('frames-top.png') });
          const reads = state.reads;
          await first.getByRole('button', { name: '立即兑换' }).click();
          const confirm = page.getByRole('dialog', { name: '确认兑换头像框', exact: true });
          await expect(confirm).toContainText('100 积分');
          await page.keyboard.press('Escape');
          await expect(confirm).toHaveCount(0);
          await expect(first.getByRole('button')).toBeFocused();
          expect(state.exchanges).toBe(0);
          await first.getByRole('button').click();
          await confirm.getByRole('button', { name: '确认兑换', exact: true }).click();
          await expect(confirm.getByRole('alert')).toContainText('兑换暂时失败');
          state.exchangeFail = false;
          await confirm.getByRole('button', { name: '确认兑换', exact: true }).click();
          await expect(confirm).toHaveCount(0);
          await expect(first.getByRole('button', { name: '使用', exact: true })).toBeEnabled();
          await expect(dialog).toContainText('800');
          expect(state.reads).toBe(reads);
          await first.getByRole('button').click();
          await expect(dialog.getByRole('alert').filter({ hasText: '穿戴暂时失败' })).toBeVisible();
          state.wearFail = false;
          await first.getByRole('button').click();
          await expect(first.getByRole('button', { name: '使用中' })).toBeDisabled();
          await expect(dialog.getByRole('status').filter({ hasText: '已使用' })).toBeVisible();
          const defaultCard = dialog.getByRole('article').filter({ hasText: '不使用头像框' });
          await defaultCard.getByRole('button').click();
          await expect(defaultCard.getByRole('button', { name: '使用中' })).toBeDisabled();
          await scroll.evaluate((e) => {
            e.scrollTop = e.scrollHeight / 2;
          });
          await assertArea(scroll, viewport.width < 760);
          await scroll.evaluate((e) => {
            e.scrollTop = e.scrollHeight;
          });
          await expect(dialog.getByRole('alert').filter({ hasText: '追加失败' })).toBeVisible();
          state.moreFail = false;
          await dialog.getByRole('button', { name: '重试头像框' }).click();
          await expect(
            dialog.getByRole('heading', { name: '海风头像框 13', exact: true }),
          ).toHaveCount(1);
          await expect(
            dialog.getByRole('heading', { name: '海风头像框 12', exact: true }),
          ).toHaveCount(1);
          await expect(dialog.getByText('已全部加载')).toBeVisible();
          await scroll.evaluate((e) => {
            e.scrollTop = e.scrollHeight;
          });
          await assertArea(scroll, viewport.width < 760);
          const last = dialog.getByRole('article').last().getByRole('button');
          await last.focus();
          await expect(last).toBeInViewport();
          await page.screenshot({ path: info.outputPath('frames-bottom.png') });
          expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          if (skin.id === 'wechat' && mode === 'light') {
            const before = state.reads;
            const position = await scroll.evaluate((e) => e.scrollTop);
            await page.evaluate(async () => {
              const path = '/src/features/appearance/index.ts';
              const { useAppearanceStore } = (await import(
                path
              )) as typeof import('../../src/features/appearance');
              useAppearanceStore.getState().setSkinId('wps');
              useAppearanceStore.getState().setColorMode('dark');
            });
            await expect(page.locator('html')).toHaveAttribute('data-skin', 'wps');
            expect(state.reads).toBe(before);
            expect(await scroll.evaluate((e) => e.scrollTop)).toBe(position);
          }
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(page.getByRole('button', { name: '用户菜单', exact: true })).toBeFocused();
          expect(state.sockets).toBe(1);
          expect(state.exchanges).toBe(2);
          expect(state.sets).toBe(3);
        });
      }
  });
}
