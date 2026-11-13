import { describe, it, expect, vi, afterEach } from 'vitest';
import { createStockClient } from './index';
import { candle, trade, quote, position } from './decode';
afterEach(() => vi.unstubAllGlobals());
describe('stock protocol', () => {
  it('拒绝旧后端行情失败时返回的0点占位', () => {
    expect(
      quote({ indexCode: 'sh000001', indexName: '上证', currentValue: 0, changePercent: '0%' }),
    ).toMatchObject({ price: null, change: null });
  });
  it('兼容旧版持仓未提供冻结份额', () => {
    expect(
      position({
        indexCode: 'sh000001',
        indexName: '上证指数',
        totalShares: '0',
        availableShares: '0',
        lockedShares: '0',
        avgCost: '0',
        marketValue: '0',
        totalProfit: '0',
      }).frozen,
    ).toBe(0);
  });
  it('校验OHLC而不是从快照生成蜡烛', () => {
    expect(() =>
      candle({ date: '2026-11-12', open: 3, close: 4, high: 2, low: 1, volume: 0 }),
    ).toThrow();
    expect(() =>
      candle({ date: '2026-11-12', open: 'bad', close: 4, high: 5, low: 1, volume: 0 }),
    ).toThrow();
  });
  it('成交净值乘1000；ID保留为字符串', () => {
    expect(
      trade({
        id: '9007199254740993123',
        indexCode: 'sh000001',
        indexName: '上证',
        tradeType: 2,
        createTime: '2026-11-12T11:00:00',
        nav: '3.65',
        shares: '12',
        amount: 43,
        statusName: '待结算',
      }),
    ).toMatchObject({ id: '9007199254740993123', price: 3650, type: 'S' });
  });
  it('携带登录凭证、取消信号并在过期时通知', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 40100 })));
    vi.stubGlobal('fetch', fetcher);
    const expired = vi.fn();
    const client = createStockClient(
      'https://stock.test',
      () => ({ name: 'test-session', value: 'synthetic-value' }),
      expired,
    );
    await expect(client.quotes(new AbortController().signal)).rejects.toThrow('登录已过期');
    expect(expired).toHaveBeenCalledOnce();
    const options = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(options.headers).get('test-session')).toBe('synthetic-value');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it('未部署图表端点明确报错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    const client = createStockClient(
      'https://stock.test',
      () => ({ name: 'test-session', value: 'synthetic-value' }),
      () => {},
    );
    await expect(client.chart('sh000001', 60, new AbortController().signal)).rejects.toThrow(
      '尚未部署',
    );
  });
});
