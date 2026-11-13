import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { fixture, candles, trade } from './stock-fixture';
test('全部主题模式视口的控件、长成交弹窗与滚动边界', async ({ page }) => {
  test.setTimeout(180000);
  await fixture(page);
  await page.route('**/api/index/chart?**', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: {
          candles,
          trades: Array.from({ length: 50 }, (_, i) => trade(String(i))),
          truncated: false,
        },
      },
    }),
  );
  await page.goto('/game/stock/sh000001');
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      for (const width of [1440, 375, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        const b = page.getByRole('button', { name: '2026-11-09 买入 B 50笔' });
        await b.click();
        const dialog = page.getByRole('dialog');
        const region = dialog.getByRole('region', { name: '成交详情' });
        await expect(region.locator('li')).toHaveCount(50);
        await region.focus();
        await region.press('End');
        await region.locator('li').last().scrollIntoViewIfNeeded();
        await expect(region.locator('li').last()).toBeVisible();
        const metrics = await region.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const child = element.querySelector('li')!.getBoundingClientRect();
          const track = element.parentElement!.querySelector('[data-orientation="vertical"]');
          return {
            overflow: element.scrollWidth > element.clientWidth,
            position: element.scrollTop,
            gap: rect.right - child.right,
            track: track ? getComputedStyle(track).visibility : 'hidden',
          };
        });
        expect(metrics.overflow).toBe(false);
        expect(metrics.position).toBeGreaterThan(0);
        expect(metrics.gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        if (width <= 760) expect(metrics.track).toBe('hidden');
        if (width > 760) await region.hover();
        await region.press('Home');
        await region.locator('li').first().scrollIntoViewIfNeeded();
        await expect(region.locator('li').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(b).toBeFocused();
        const range = page.getByRole('combobox', { name: '行情范围' });
        await range.click();
        await expect(page.getByRole('option', { name: '近 250 个交易日' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(range).toBeFocused();
        await page.getByRole('button', { name: '买入 上证指数', exact: true }).click();
        const form = page.getByRole('dialog');
        await page.getByLabel('买入积分', { exact: true }).fill('200');
        const confirm = form.getByRole('button', { name: '确认买入' });
        expect((await confirm.boundingBox())!.height).toBe(width <= 760 ? 44 : 32);
        const input = page.getByLabel('买入积分', { exact: true });
        await input.focus();
        const gap = await input.evaluate(
          (e) =>
            e.closest('[data-radix-scroll-area-viewport]')!.getBoundingClientRect().right -
            e.getBoundingClientRect().right,
        );
        expect(gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
});

test('手机触屏成交详情滚动与交易输入', async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await fixture(page);
    await page.route('**/api/index/chart?**', (r) =>
      r.fulfill({
        json: {
          code: 0,
          data: {
            candles,
            trades: Array.from({ length: 50 }, (_, i) => trade(String(i))),
            truncated: false,
          },
        },
      }),
    );
    await page.goto('/game/stock/sh000001');
    const cdp = await context.newCDPSession(page);
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark'])
        for (const width of [375, 390]) {
          await page.setViewportSize({ width, height: 844 });
          await page.evaluate(
            async ({ skin, mode }) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              useAppearanceStore.getState().setSkinId(skin as never);
              useAppearanceStore.getState().setColorMode(mode as never);
            },
            { skin: skin.id, mode },
          );
          const b = page.getByRole('button', { name: '2026-11-09 买入 B 50笔' });
          await b.scrollIntoViewIfNeeded();
          let bounds = (await b.boundingBox())!;
          await page.touchscreen.tap(bounds.x + 22, bounds.y + 22);
          const region = page.getByRole('dialog').getByRole('region', { name: '成交详情' });
          await expect(region).toBeVisible();
          bounds = (await region.boundingBox())!;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - 30 }],
          });
          for (let step = 1; step <= 10; step++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [
                { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - 30 - step * 20 },
              ],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
          await region.locator('li').last().scrollIntoViewIfNeeded();
          await expect(region.locator('li').last()).toBeVisible();
          const close = page.getByRole('button', { name: '关闭成交详情' });
          bounds = (await close.boundingBox())!;
          await page.touchscreen.tap(bounds.x + 22, bounds.y + 22);
          const buy = page.getByRole('button', { name: '买入 上证指数', exact: true });
          await buy.scrollIntoViewIfNeeded();
          bounds = (await buy.boundingBox())!;
          await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + 22);
          const input = page.getByLabel('买入积分', { exact: true });
          await input.fill('200');
          await page.setViewportSize({ width, height: 500 });
          await input.focus();
          await expect(input).toBeVisible();
          const cancel = page.getByRole('dialog').getByRole('button', { name: '取消' });
          await expect(cancel).toBeVisible();
          bounds = (await cancel.boundingBox())!;
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(500);
          await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + 22);
          await page.setViewportSize({ width, height: 844 });
        }
    await cdp.detach();
  } finally {
    await context.close();
  }
});

test('概览页签键盘、详情返回与主题请求状态保留', async ({ page }) => {
  test.setTimeout(120000);
  const state = await fixture(page);
  await page.goto('/game/stock');
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      for (const width of [1920, 375, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const chartCalls = state.chartCalls;
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        expect(state.chartCalls).toBe(chartCalls);
        const market = page.getByRole('tab', { name: '市场行情', exact: true });
        await market.click();
        await market.press('ArrowRight');
        const positions = page.getByRole('tab', { name: '我的持仓', exact: true });
        await expect(positions).toBeFocused();
        await expect(positions).toHaveAttribute('aria-selected', 'true');
        await positions.press('End');
        const history = page.getByRole('tab', { name: '交易记录', exact: true });
        await expect(history).toBeFocused();
        await expect(
          page.getByRole('region', { name: '交易记录', exact: true }).locator('li').first(),
        ).toBeVisible();
        const requests = state.pages.length;
        await history.press('Home');
        await expect(market).toBeFocused();
        await market.press('ArrowRight');
        await page.getByRole('button', { name: '查看详情', exact: true }).click();
        await expect(page).toHaveURL('/game/stock/sh000001');
        if (width <= 760)
          await page.getByRole('link', { name: '返回股市概览', exact: true }).click();
        else await page.getByRole('button', { name: '返回股市', exact: true }).click();
        await expect(positions).toHaveAttribute('aria-selected', 'true');
        expect(state.pages.length).toBe(requests);
        await market.click();
      }
});
