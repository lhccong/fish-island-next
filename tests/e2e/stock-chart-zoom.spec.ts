import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { fixture, trade } from './stock-fixture';
const candles = Array.from({ length: 250 }, (_, i) => ({
  date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
  open: 3500 + i,
  close: 3510 + i,
  high: 3530 + i,
  low: 3480 + i,
  volume: 100,
}));
const trades = candles.map((c, i) => ({
  ...trade(String(i)),
  createTime: c.date + 'T10:00:00',
  nav: String((3505 + i) / 1000),
}));
trades.push({ ...trade('sell', 2), createTime: candles.at(-1)!.date + 'T10:00:00', nav: '3.755' });
test('全主题明暗和三视口历史展开与真实买卖点', async ({ page }, info) => {
  test.setTimeout(240000);
  const state = await fixture(page);
  let status = 'ready';
  await page.route('**/api/index/chart?**', async (r) => {
    state.chartCalls++;
    if (status === 'loading') await new Promise((resolve) => setTimeout(resolve, 500));
    await r.fulfill({
      status: status === 'error' ? 503 : 200,
      json: {
        code: 0,
        data: {
          candles: status === 'empty' ? [] : candles,
          trades: status === 'empty' ? [] : trades,
          truncated: false,
        },
      },
    });
  });
  await page.goto('/game/stock/sh000001');
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      for (const width of [1920, 375, 390]) {
        await page.setViewportSize({ width, height: 950 });
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        const graph = page.getByRole('img', { name: /指数日 K 线/ });
        const slider = page.getByRole('slider', { name: '查看历史 K 线' });
        await expect(graph).toHaveAttribute('data-candle-count', '20');
        const latest = candles.at(-1)!.date;
        const requests = state.chartCalls;
        const originalWidth = Number(await graph.locator('rect').first().getAttribute('width'));
        await slider.scrollIntoViewIfNeeded();
        const bounds = (await slider.boundingBox())!;
        await page.mouse.move(bounds.x + 8, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width - 8, bounds.y + bounds.height / 2, {
          steps: 8,
        });
        await page.mouse.up();
        await expect(graph).toHaveAttribute('data-candle-count', '250');
        await expect(graph).toHaveAttribute('data-start-date', candles[0]!.date);
        await expect(graph).toHaveAttribute('data-end-date', latest);
        expect(Number(await graph.locator('rect').first().getAttribute('width'))).toBeLessThan(
          originalWidth,
        );
        const points = graph.locator('[data-trade-id]');
        await expect(points).toHaveCount(251);
        const first = graph.locator('[data-trade-id="0"]');
        expect(Number(await first.getAttribute('cx'))).toBeCloseTo((600 * 0.5) / 250);
        expect(Number(await first.getAttribute('cy'))).toBeGreaterThan(30);
        expect(Number(await first.getAttribute('cy'))).toBeLessThan(270);
        const markers = page.locator('[data-marker-trade-count]');
        await expect.poll(async () => markers.count()).toBeLessThan(width > 760 ? 40 : 8);
        const boxes = await markers.evaluateAll((nodes) =>
          nodes.map((n) => n.getBoundingClientRect().toJSON()),
        );
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!,
              b = boxes[j]!;
            expect(
              a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
            ).toBe(true);
          }
        const anchors = await markers.evaluateAll((nodes) =>
          nodes.map((n) => {
            const id = (n as HTMLElement).dataset.markerAnchorId!;
            const dot = document.querySelector(`[data-trade-id="${id}"]`)!.getBoundingClientRect();
            const box = n.getBoundingClientRect();
            return {
              x: dot.x + dot.width / 2,
              y: dot.y + dot.height / 2,
              left: box.left,
              right: box.right,
              top: box.top,
              bottom: box.bottom,
            };
          }),
        );
        for (const a of anchors)
          expect(a.x < a.left || a.x > a.right || a.y < a.top || a.y > a.bottom).toBe(true);
        const buy = markers.filter({ hasText: 'B' }).first();
        await buy.click();
        await expect(
          page.getByRole('dialog').getByText(candles[0]!.date + ' 10:00:00', { exact: true }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(buy).toBeFocused();
        expect(state.chartCalls).toBe(requests);
        await graph.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-${width}.png`) });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        status = 'loading';
        await page.getByRole('button', { name: '刷新 K 线' }).click();
        await expect(page.getByText('正在加载日 K 与成交标记…')).toBeVisible();
        await expect(graph).toHaveAttribute('data-candle-count', '20');
        status = 'error';
        await page.getByRole('button', { name: '刷新 K 线' }).click();
        await expect(page.getByRole('button', { name: '重试 K 线' })).toBeVisible();
        status = 'empty';
        await page.getByRole('button', { name: '重试 K 线' }).click();
        await expect(page.getByText('暂无日 K 行情，请稍后刷新。')).toBeVisible();
        status = 'ready';
        await page.getByRole('button', { name: '刷新 K 线' }).click();
        await expect(graph).toHaveAttribute('data-candle-count', '20');
      }
});
test('手机触屏拖动历史保留最新日并可触达买卖明细', async ({ browser }) => {
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
      r.fulfill({ json: { code: 0, data: { candles, trades, truncated: false } } }),
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
          const slider = page.getByRole('slider', { name: '查看历史 K 线' });
          await slider.fill('0');
          await slider.scrollIntoViewIfNeeded();
          const box = (await slider.boundingBox())!;
          const y = box.y + box.height / 2;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: box.x + 8, y }],
          });
          for (let step = 1; step <= 10; step++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: box.x + 8 + ((box.width - 16) * step) / 10, y }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect(page.getByRole('img', { name: /指数日 K 线/ })).toHaveAttribute(
            'data-candle-count',
            '250',
          );
          const marker = page.locator('[data-marker-type="B"]').first();
          await marker.scrollIntoViewIfNeeded();
          const rect = (await marker.boundingBox())!;
          await page.touchscreen.tap(rect.x + 22, rect.y + 22);
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.getByRole('button', { name: '关闭成交详情' }).click();
        }
    await cdp.detach();
  } finally {
    await context.close();
  }
});
