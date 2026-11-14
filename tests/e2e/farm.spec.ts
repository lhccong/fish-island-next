import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture, makeLands } from './farm-fixture';
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} 农场全视口状态与操作`, async ({ page }, testInfo) => {
      test.setTimeout(180000);
      const state = await farmFixture(page);
      for (const width of [1440, 375, 390]) {
        await page.setViewportSize({ width, height: 900 });
        state.lands = makeLands();
        state.status = 'loading';
        state.failAction = false;
        state.read = false;
        await page.goto('/game/farm');
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        await expect(page.getByText('正在照看田地…')).toBeVisible({ timeout: 30000 });
        state.status = 'ready';
        await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible();
        state.status = 'ready';
        if (skin.id === 'wechat' && mode === 'light')
          await page.screenshot({ path: testInfo.outputPath(`farm-${width}.png`), fullPage: true });
        await page.getByRole('button', { name: /一键收获/ }).click();
        await expect(page.getByText('收获成功', { exact: true })).toBeVisible();
        const seedTrigger = page.getByRole('button', { name: /批量播种/ });
        await seedTrigger.click();
        const dialog = page.getByRole('dialog');
        const region = dialog.getByRole('region', { name: '种子目录' });
        await expect(region.getByRole('button')).toHaveCount(22);
        await region.hover();
        await region.getByRole('button').last().scrollIntoViewIfNeeded();
        expect(await region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
        const metrics = await region.evaluate((e) => {
          const rect = e.getBoundingClientRect();
          const button = e.querySelector('button')!.getBoundingClientRect();
          const track = e.parentElement!.querySelector('[data-orientation="vertical"]');
          return {
            gap: rect.right - button.right,
            overflow: e.scrollWidth > e.clientWidth,
            track: track ? getComputedStyle(track).visibility : 'hidden',
          };
        });
        expect(metrics.gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        expect(metrics.overflow).toBe(false);
        expect(metrics.track).toBe(width <= 760 ? 'hidden' : 'visible');
        await region.getByRole('button').first().scrollIntoViewIfNeeded();
        await region.getByRole('button', { name: /^小萝卜/ }).click();
        const requests = state.calls;
        await page.evaluate(async () => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          const store = useAppearanceStore.getState();
          store.setColorMode(store.colorMode === 'light' ? 'dark' : 'light');
          store.setColorMode(store.colorMode);
        });
        await expect(region.getByRole('button', { name: /^小萝卜/ })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        expect(state.calls).toBe(requests);
        const combo = dialog.getByRole('combobox');
        await combo.click();
        await expect(page.getByRole('option', { name: '蔬菜', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(combo).toBeFocused();
        const submit = dialog.getByRole('button', { name: '确认播种' });
        expect((await submit.boundingBox())!.height).toBe(width <= 760 ? 44 : 32);
        state.failAction = true;
        await submit.click();
        await expect(
          page.getByRole('status').filter({ hasText: '积分不足，请补充积分后重试' }),
        ).toBeVisible();
        state.failAction = false;
        await submit.click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByText('播种成功', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: '一键浇水', exact: true }).click();
        await expect(page.getByText(/浇水完成/)).toBeVisible();
        await page.getByRole('button', { name: /^9号地/ }).click();
        await page.getByRole('button', { name: '确认开垦' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.getByText('地块已解锁', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: '好友', exact: true }).click();
        await page.getByRole('button', { name: '拜访', exact: true }).click();
        await expect(page.getByRole('heading', { name: '合成好友的农场' })).toBeVisible();
        await page.getByRole('button', { name: /一键偷菜/ }).click();
        await expect(page.getByText('偷菜成功，获得 2 积分')).toBeVisible();
        await page.getByRole('button', { name: '回家', exact: true }).click();
        await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible();
        await page.getByRole('button', { name: '访客', exact: true }).click();
        await page.getByRole('button', { name: '全部已读', exact: true }).click();
        await expect(page.getByText('访客记录已全部标记已读')).toBeVisible();
        await page.keyboard.press('Escape');
        state.status = 'error';
        await page.getByRole('button', { name: '刷新', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('HTTP 503');
        state.status = 'empty';
        await page.getByRole('button', { name: '重新加载', exact: true }).click();
        await expect(page.getByText('暂时没有地块，请刷新同步农场。')).toBeVisible();
        state.status = 'socialEmpty';
        await page.getByRole('button', { name: '好友', exact: true }).click();
        await expect(page.getByText('还没有同玩好友，互相关注后会出现在这里。')).toBeVisible();
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    });
  }
test('目录入口与提交成功后刷新失败的恢复', async ({ page }) => {
  const state = await farmFixture(page);
  await page.goto('/discover/games');
  await page.getByRole('button', { name: '打开摸鱼农场', exact: true }).click();
  await expect(page).toHaveURL('/game/farm');
  await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible();
  state.failRefresh = true;
  await page.getByRole('button', { name: /一键收获/ }).click();
  await expect(page.getByText('收获成功；最新数据同步失败，请刷新核对后再操作')).toBeVisible();
  await expect(page.getByRole('button', { name: /一键收获/ })).toBeDisabled();
  expect(state.actions.filter((a) => a.path.endsWith('/harvest'))).toHaveLength(1);
  state.failRefresh = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByRole('button', { name: /^1号地.*待播种/ })).toBeVisible();
});
