import type { Candle, Position, Quote, Trade } from '@/domain/stock';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('股市服务返回格式异常');
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('股市字段缺失');
  return value;
}
export function num(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '')
    throw new Error('股市数值缺失');
  const parsed = Number(typeof value === 'string' ? value.replace(/%$/, '') : value);
  if (!Number.isFinite(parsed)) throw new Error('股市数值异常');
  return parsed;
}
export function list<T>(value: unknown, decode: (v: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('股市列表格式异常');
  return value.map(decode);
}
export function quote(value: unknown): Quote {
  const d = record(value);
  const price = num(d.currentValue);
  return {
    code: text(d.indexCode),
    name: text(d.indexName),
    price: price > 0 ? price : null,
    change: price > 0 ? num(d.changePercent) : null,
    changeValue: price > 0 && d.changeValue != null ? num(d.changeValue) : null,
  };
}
export function position(value: unknown): Position {
  const d = record(value);
  return {
    code: text(d.indexCode),
    name: text(d.indexName),
    shares: num(d.totalShares),
    available: num(d.availableShares),
    locked: num(d.lockedShares),
    frozen: d.frozenShares == null ? 0 : num(d.frozenShares),
    cost: num(d.avgCost),
    value: num(d.marketValue),
    profit: num(d.totalProfit),
  };
}
export function trade(value: unknown): Trade {
  const d = record(value);
  if (d.tradeType !== 1 && d.tradeType !== 2) throw new Error('交易方向异常');
  const id = typeof d.id === 'number' && Number.isSafeInteger(d.id) ? String(d.id) : text(d.id);
  return {
    id,
    code: text(d.indexCode),
    name: text(d.indexName),
    type: d.tradeType === 1 ? 'B' : 'S',
    time: text(d.createTime),
    price: num(d.nav) * 1000,
    shares: num(d.shares),
    amount: num(d.amount),
    status: text(d.statusName),
  };
}
export function candle(value: unknown): Candle {
  const d = record(value);
  const result = {
    date: text(d.date),
    open: num(d.open),
    close: num(d.close),
    high: num(d.high),
    low: num(d.low),
    volume: num(d.volume),
  };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result.date) ||
    result.low <= 0 ||
    result.high < Math.max(result.open, result.close) ||
    result.low > Math.min(result.open, result.close) ||
    result.volume < 0
  )
    throw new Error('K 线行情数据异常');
  return result;
}
