import { describe, it, expect } from 'vitest';
import { groupMarkers, type Candle, type Trade } from '@/domain/stock';
import {
  expandedCandles,
  layoutMarkers,
  projectTrades,
  priceScale,
  positionMarkers,
} from './chart-view';
const candles: Candle[] = Array.from({ length: 250 }, (_, i) => ({
  date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
  open: 3500 + i,
  close: 3510 + i,
  high: 3530 + i,
  low: 3480 + i,
  volume: 100,
}));
const trade = (id: string, i: number, type: 'B' | 'S', price = 3505 + i): Trade => ({
  id,
  code: 'sh000001',
  name: '上证指数',
  type,
  time: cadate(i) + 'T10:00:00',
  price,
  shares: 1,
  amount: 100,
  status: '已完成',
});
const cadate = (i: number) => candles[i]!.date;
describe('历史展开和实际成交定位', () => {
  it('展开20/120/250根时始终保留最新交易日，最早日持续向前扩展', () => {
    for (const extra of [0, 100, 230, 999]) {
      const view = expandedCandles(candles, extra);
      expect(view).toHaveLength(Math.min(250, 20 + extra));
      expect(view.at(-1)).toEqual(candles.at(-1));
    }
    expect(expandedCandles(candles, 230)[0]).toEqual(candles[0]);
    expect(expandedCandles(candles.slice(0, 8), 230)).toHaveLength(8);
    expect(expandedCandles([], 0)).toEqual([]);
  });
  it('成交日期与对应蜡烛中心完全对齐，成交价参与同一纵轴', () => {
    const trades = [trade('1', 0, 'B', 3400), trade('2', 249, 'S', 3900)];
    const points = projectTrades(candles, trades);
    const scale = priceScale(candles, points);
    expect(points[0]?.x).toBe((0.5 / 250) * 100);
    expect(points[1]?.x).toBe((249.5 / 250) * 100);
    expect(scale.y(3900)).toBe(30);
    expect(scale.y(3400)).toBe(270);
    expect(projectTrades(expandedCandles(candles, 0), trades)).toHaveLength(1);
  });
  it('缩小聚合标签保留全部原始点，锚定真实成交价而不是平均价', () => {
    const trades = candles.map((_, i) => trade(String(i), i, 'B'));
    const groups = groupMarkers({ candles, trades, truncated: false }).groups;
    const markers = layoutMarkers(groups, candles, 280);
    expect(markers.length).toBeLessThan(7);
    expect(markers.flatMap((m) => m.trades)).toHaveLength(250);
    expect(markers.every((m) => m.price === m.trades[0]?.price)).toBe(true);
    expect(projectTrades(candles, trades)).toHaveLength(250);
    const scale = priceScale(candles, trades);
    const labels = positionMarkers(markers, 280, scale.y);
    for (const label of labels) {
      expect(label.pointY).toBe(scale.y(label.trades[0]!.price));
      expect(label.labelY).toBeGreaterThanOrEqual(4);
      expect(label.labelY + 44).toBeLessThanOrEqual(300);
      const x = (label.x / 100) * 280,
        left = (label.labelX / 100) * 280 - 22;
      expect(
        x < left ||
          x > left + 44 ||
          label.pointY < label.labelY ||
          label.pointY > label.labelY + 44,
      ).toBe(true);
    }
  });
});
