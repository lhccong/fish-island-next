import type { StockPort } from '@/domain/stock';
import type { SessionToken } from '@/domain/auth';
import { record, text, num, list, quote, position, trade, candle } from './decode';
export function createStockClient(
  base: string,
  token: () => SessionToken | null,
  expired: () => void,
): StockPort {
  async function request(path: string, signal: AbortSignal, body?: object): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请先登录后进入摸鱼股市');
    const headers = new Headers({ [credential.name]: credential.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) {
        expired();
        throw new Error('登录已过期，请重新登录');
      }
      if (response.status === 404 && path.startsWith('index/chart'))
        throw new Error('K 线服务尚未部署，请更新后端后重试');
      if (!response.ok) throw new Error(`股市服务暂不可用（HTTP ${response.status}），请重试`);
      const data = record(await response.json());
      if (data.code === 40100) {
        expired();
        throw new Error('登录已过期，请重新登录');
      }
      if (data.code !== 0)
        throw new Error(typeof data.message === 'string' ? data.message : '操作失败，请重试');
      return data.data;
    } catch (error) {
      if (error instanceof TypeError && !signal.aborted)
        throw new Error('连接股市服务失败，请检查网络后重试');
      throw error;
    }
  }
  return {
    async quotes(signal) {
      return list(await request('fund/indices', signal), quote);
    },
    async positions(signal) {
      return list(await request('index/trade/positions', signal), position);
    },
    async balance(signal) {
      const d = record(await request('user/get/login', signal));
      return num(d.points) - num(d.usedPoints);
    },
    async chart(code, days, signal) {
      const d = record(
        await request(`index/chart?indexCode=${encodeURIComponent(code)}&days=${days}`, signal),
      );
      const candles = list(d.candles, candle).sort((a, b) => a.date.localeCompare(b.date));
      if (new Set(candles.map((c) => c.date)).size !== candles.length)
        throw new Error('K 线日期重复');
      return { candles, trades: list(d.trades, trade), truncated: d.truncated === true };
    },
    async transactions(page, signal) {
      const d = record(
        await request('index/trade/transactions', signal, { current: page, pageSize: 20 }),
      );
      return { items: list(d.records, trade), total: num(d.total) };
    },
    async trade(code, type, value, signal) {
      const d = record(
        await request(
          `index/trade/${type === 'B' ? 'buy' : 'sell'}`,
          signal,
          type === 'B' ? { indexCode: code, amount: value } : { indexCode: code, shares: value },
        ),
      );
      text(d.transactionId);
      return text(d.message);
    },
  };
}
