import { describe, it, expect } from 'vitest';
import { groupMarkers, type Chart, type Trade } from './index';
const trade = (id: string, type: 'B' | 'S', date = '2026-11-12'): Trade => ({
  id,
  type,
  time: date + 'T10:30:00',
  code: 'sh000001',
  name: '上证指数',
  price: 3600,
  amount: 100,
  shares: 2,
  status: '待结算',
});
describe('成交标记', () => {
  it('同日同方向聚合，卖出待结算仍有S，不移动非交易日成交', () => {
    const chart: Chart = {
      candles: [{ date: '2026-11-12', open: 3600, high: 3700, low: 3500, close: 3650, volume: 10 }],
      trades: [trade('1', 'B'), trade('2', 'B'), trade('3', 'S'), trade('4', 'S', '2026-11-14')],
      truncated: false,
    };
    const result = groupMarkers(chart);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]?.trades).toHaveLength(2);
    expect(result.groups[1]?.type).toBe('S');
    expect(result.unmatched).toBe(1);
  });
});
