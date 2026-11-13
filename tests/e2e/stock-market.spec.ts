import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { fixture } from './stock-fixture';
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1920, 375, 390]) {
      test(`${skin.id} ${mode} ${width} stock overview and detail`, async ({ page }, info) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 950 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        const state = await fixture(page);
        await page.goto('/discover/games');
        await page.getByRole('button', { name: '打开摸鱼股市', exact: true }).click();
        await expect(page).toHaveURL('/game/stock');
        await expect(page.getByRole('tab', { name: '市场行情', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        const cards = page.getByRole('button', { name: /^查看 .* 详情$/ });
        await expect(cards).toHaveCount(5);
        expect(state.chartCalls).toBe(0);
        expect(state.pages).toHaveLength(0);
        await expect(page.getByRole('region', { name: '日K与买卖点' })).toHaveCount(0);
        const bounds = await cards.evaluateAll((elements) =>
          elements.map((e) => e.getBoundingClientRect().toJSON()),
        );
        if (width > 760) {
          expect(bounds[0]!.top).toBe(bounds[2]!.top);
          expect(bounds[3]!.top).toBeGreaterThan(bounds[0]!.top);
          expect(bounds[2]!.right).toBeGreaterThan(width - 80);
        } else expect(bounds[1]!.top).toBeGreaterThan(bounds[0]!.bottom);
        await page.screenshot({ path: info.outputPath('overview.png'), fullPage: true });
        await page.getByRole('button', { name: '查看 上证指数 详情', exact: true }).click();
        await expect(page).toHaveURL('/game/stock/sh000001');
        const b = page.getByRole('button', { name: '2026-11-09 买入 B 2笔' });
        const s = page.getByRole('button', { name: '2026-11-09 卖出 S 1笔' });
        await expect(b).toBeVisible();
        await expect(s).toBeVisible();
        await b.click();
        await expect(
          page.getByRole('dialog').getByText('成交点位 3,500 · 已完成').first(),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(b).toBeFocused();
        await s.click();
        await expect(
          page
            .getByRole('dialog')
            .getByText(/待结算/)
            .last(),
        ).toBeVisible();
        await page.getByRole('button', { name: '关闭成交详情' }).click();
        const range = page.getByRole('slider', { name: '查看历史 K 线' });
        await range.fill('20');
        await expect(b).toBeVisible();
        await expect(page.getByRole('img', { name: /指数日 K 线/ })).toHaveAttribute(
          'data-candle-count',
          '40',
        );
        await range.fill('0');
        await expect(b).toBeVisible();
        await page.getByRole('button', { name: '买入 上证指数', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByLabel('买入积分', { exact: true }).fill('200');
        const requests = state.chartCalls;
        await page.evaluate(async () => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          useAppearanceStore
            .getState()
            .setSkinId(useAppearanceStore.getState().skinId === 'wps' ? 'wechat' : 'wps');
          useAppearanceStore
            .getState()
            .setColorMode(useAppearanceStore.getState().colorMode === 'dark' ? 'light' : 'dark');
        });
        await expect(dialog.getByLabel('买入积分', { exact: true })).toHaveValue('200');
        expect(state.chartCalls).toBe(requests);
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        state.submitFail = true;
        await dialog.getByRole('button', { name: '确认买入' }).click();
        await expect(dialog.getByRole('alert')).toContainText('积分不足');
        state.submitFail = false;
        await dialog.getByRole('button', { name: '确认买入' }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByRole('status').filter({ hasText: '买入成功' })).toBeVisible();
        await page.getByRole('button', { name: '卖出', exact: true }).click();
        await page.getByLabel('卖出份额', { exact: true }).fill('1.1234');
        await page.getByRole('button', { name: '确认卖出' }).click();
        await expect(page.getByRole('status').filter({ hasText: '卖出成功' })).toBeVisible();
        await b.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('detail.png') });
        state.chart = 'loading';
        await page.getByRole('button', { name: '刷新 K 线' }).click();
        await expect(page.getByText('正在加载日 K 与成交标记…')).toBeVisible();
        await expect(b).toBeVisible();
        state.chart = 'error';
        await page.getByRole('button', { name: '刷新 K 线' }).click();
        await expect(page.getByRole('button', { name: '重试 K 线' })).toBeVisible();
        state.chart = 'empty';
        await page.getByRole('button', { name: '重试 K 线' }).click();
        await expect(page.getByText('暂无日 K 行情，请稍后刷新。')).toBeVisible();
        await page.getByRole('button', { name: '返回股市' }).click();
        await expect(page).toHaveURL('/game/stock');
        await page.getByRole('tab', { name: '我的持仓', exact: true }).click();
        await expect(page.getByRole('region', { name: '我的持仓', exact: true })).toBeVisible();
        await page.getByRole('button', { name: '查看详情', exact: true }).click();
        await expect(page).toHaveURL('/game/stock/sh000001');
        await page.getByRole('button', { name: '返回股市' }).click();
        await expect(page.getByRole('tab', { name: '我的持仓', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        state.position = 'error';
        await page.getByRole('button', { name: '刷新数据' }).click();
        await expect(page.getByRole('button', { name: '重试持仓' })).toBeVisible();
        state.position = 'empty';
        await page.getByRole('button', { name: '重试持仓' }).click();
        await expect(page.getByText('暂无持仓，从市场行情选择指数买入。')).toBeVisible();
        await page.getByRole('tab', { name: '市场行情', exact: true }).click();
        state.quote = 'partial';
        await page.getByRole('button', { name: '刷新数据' }).click();
        await expect(page.getByText('行情暂不可用，点击查看历史走势')).toBeVisible();
        await expect(cards).toHaveCount(5);
        await expect(
          page.getByRole('button', { name: '买入 深证成指', exact: true }),
        ).toBeDisabled();
        state.quote = 'error';
        await page.getByRole('button', { name: '刷新数据' }).click();
        await expect(page.getByRole('button', { name: '重试行情' })).toBeVisible();
        state.quote = 'empty';
        await page.getByRole('button', { name: '重试行情' }).click();
        await expect(page.getByText('暂无市场行情，请稍后刷新。')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      });
    }
test('交易记录滚动续载、失败恢复、重复ID去重、空页停止', async ({ page }) => {
  const state = await fixture(page);
  state.historyFail = true;
  await page.goto('/game/stock');
  await page.getByRole('tab', { name: '交易记录', exact: true }).click();
  const history = page.getByRole('region', { name: '交易记录', exact: true });
  await history.locator('[data-scroll-pagination="交易记录"]').scrollIntoViewIfNeeded();
  await expect(history.getByRole('button', { name: '重试交易记录' })).toBeVisible();
  expect(state.pages.filter((p) => p > 1)).toEqual([2]);
  expect(state.pages.filter((p) => p === 1).length).toBeLessThanOrEqual(2);
  state.historyFail = false;
  await history.getByRole('button', { name: '重试交易记录' }).click();
  await expect(history.locator('li')).toHaveCount(21);
  await history.locator('[data-scroll-pagination="交易记录"]').scrollIntoViewIfNeeded();
  await expect(history.getByText('已全部加载')).toBeVisible();
  expect(state.pages.filter((p) => p > 1)).toEqual([2, 2, 3]);
});
