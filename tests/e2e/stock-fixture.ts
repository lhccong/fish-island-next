import type { Page } from '@playwright/test';
import { setup } from './fish-circle-fixture';
export const candles = Array.from({ length: 40 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10),
  open: 3500 + i,
  close: 3510 + i,
  high: 3530 + i,
  low: 3480 + i,
  volume: 1000,
}));
export const trade = (id: string, type = 1) => ({
  id,
  indexCode: 'sh000001',
  indexName: '上证指数',
  tradeType: type,
  createTime: '2026-11-09T10:30:00',
  nav: '3.5',
  shares: '10.1234',
  amount: 100,
  statusName: type === 1 ? '已完成' : '待结算',
});
export async function fixture(page: Page) {
  await setup(page);
  const state = {
    chart: 'ready',
    quote: 'ready',
    position: 'ready',
    historyFail: false,
    submitFail: false,
    pages: [] as number[],
    chartCalls: 0,
    submits: 0,
  };
  await page.route('**/api/user/get/login', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: {
          id: '123',
          userName: '合成岛友',
          userRole: 'admin',
          points: 10000,
          usedPoints: 100,
        },
      },
    }),
  );
  await page.route('**/api/fund/indices', (r) =>
    r.fulfill({
      status: state.quote === 'error' ? 503 : 200,
      json: {
        code: 0,
        data:
          state.quote === 'empty'
            ? []
            : [
                ['sh000001', '上证指数'],
                ['sz399001', '深证成指'],
                ['sz399006', '创业板指'],
                ['sh000300', '沪深300'],
                ['sh000016', '上证50'],
              ].map(([indexCode, indexName], i) => ({
                indexCode,
                indexName,
                currentValue: state.quote === 'partial' && i === 1 ? 0 : 3510 + i * 100,
                changeValue: i === 1 ? -14 : 17.5,
                changePercent: i === 1 ? '-0.4%' : '0.5%',
              })),
      },
    }),
  );
  await page.route('**/api/index/chart?**', async (r) => {
    state.chartCalls++;
    if (state.chart === 'loading') await new Promise((resolve) => setTimeout(resolve, 800));
    await r.fulfill({
      status: state.chart === 'error' ? 503 : 200,
      json: {
        code: 0,
        data: {
          candles: state.chart === 'empty' ? [] : candles,
          trades: state.chart === 'empty' ? [] : [trade('1'), trade('2'), trade('3', 2)],
          truncated: false,
        },
      },
    });
  });
  await page.route('**/api/index/trade/positions', (r) =>
    r.fulfill({
      status: state.position === 'error' ? 503 : 200,
      json: {
        code: 0,
        data:
          state.position === 'empty'
            ? []
            : [
                {
                  indexCode: 'sh000001',
                  indexName: '上证指数',
                  totalShares: '20',
                  availableShares: '10',
                  lockedShares: '10',
                  frozenShares: '0',
                  avgCost: '3.5',
                  marketValue: 70,
                  totalProfit: 2,
                },
              ],
      },
    }),
  );
  await page.route('**/api/index/trade/transactions', (r) => {
    const current = Number(r.request().postDataJSON().current);
    state.pages.push(current);
    return r.fulfill({
      status: state.historyFail && current === 2 ? 503 : 200,
      json: {
        code: 0,
        data: {
          records:
            current === 1
              ? Array.from({ length: 20 }, (_, i) => trade(String(i)))
              : current === 2
                ? [trade('19'), trade('20', 2)]
                : [],
          total: 22,
        },
      },
    });
  });
  await page.route('**/api/index/trade/buy', (r) => {
    state.submits++;
    return r.fulfill({
      json: state.submitFail
        ? { code: 40000, message: '积分不足' }
        : { code: 0, data: { transactionId: '1000', message: '买入成功，份额已到账' } },
    });
  });
  await page.route('**/api/index/trade/sell', (r) => {
    state.submits++;
    return r.fulfill({
      json: {
        code: 0,
        data: { transactionId: '1001', message: '卖出成功，到账 35 积分（已扣手续费）' },
      },
    });
  });
  return state;
}
