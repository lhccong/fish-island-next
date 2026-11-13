export const indices = [
  { value: 'sh000001', label: '上证指数' },
  { value: 'sz399001', label: '深证成指' },
  { value: 'sz399006', label: '创业板指' },
  { value: 'sh000300', label: '沪深300' },
  { value: 'sh000016', label: '上证50' },
] as const;
export interface Quote {
  code: string;
  name: string;
  price: number | null;
  change: number | null;
  changeValue: number | null;
}
export interface Position {
  code: string;
  name: string;
  shares: number;
  available: number;
  locked: number;
  frozen: number;
  cost: number;
  value: number;
  profit: number;
}
export interface Trade {
  id: string;
  code: string;
  name: string;
  type: 'B' | 'S';
  time: string;
  price: number;
  shares: number;
  amount: number;
  status: string;
}
export interface Candle {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}
export interface Chart {
  candles: Candle[];
  trades: Trade[];
  truncated: boolean;
}
export interface StockPort {
  quotes(signal: AbortSignal): Promise<Quote[]>;
  positions(signal: AbortSignal): Promise<Position[]>;
  balance(signal: AbortSignal): Promise<number>;
  chart(code: string, days: number, signal: AbortSignal): Promise<Chart>;
  transactions(page: number, signal: AbortSignal): Promise<{ items: Trade[]; total: number }>;
  trade(code: string, type: 'B' | 'S', value: number, signal: AbortSignal): Promise<string>;
}
export function groupMarkers(chart: Chart) {
  const dates = new Set(chart.candles.map((c) => c.date));
  const groups = new Map<string, { date: string; type: 'B' | 'S'; trades: Trade[] }>();
  let unmatched = 0;
  for (const trade of chart.trades) {
    const date = trade.time.slice(0, 10);
    if (!dates.has(date)) {
      unmatched++;
      continue;
    }
    const key = `${date}:${trade.type}`;
    const group = groups.get(key) ?? { date, type: trade.type, trades: [] };
    group.trades.push(trade);
    groups.set(key, group);
  }
  return { groups: [...groups.values()].sort((a, b) => a.date.localeCompare(b.date)), unmatched };
}
