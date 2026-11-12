import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAboutClient } from './client';
import { decodeDonations, decodeOrder } from './decode';

afterEach(() => vi.unstubAllGlobals());
describe('about legacy protocols', () => {
  it('decodes the string page total returned by the live donation service', () => {
    const result = decodeDonations({ total: '42', records: [{ id: 'synthetic-id', amount: 6.6 }] });
    expect(result.total).toBe(42);
    expect(result.records[0]?.amount).toBe(6.6);
    expect(decodeDonations({ total: '0', records: [] }).records).toEqual([]);
  });
  it('rejects invalid counts while keeping payment amounts strict', () => {
    for (const total of ['', '-1', '1.5', '1e3', 'NaN', '9007199254740992', -1, 1.5])
      expect(() => decodeDonations({ total, records: [] })).toThrow('分页总数');
    expect(() => decodeOrder({ tradeOrderId: 'id', totalFee: '6.6' })).toThrow('金额');
  });
  it('requests separate public leaderboard and detail pages with the legacy sort', async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ code: 0, data: { records: [], total: 0 } })),
      );
    vi.stubGlobal('fetch', fetcher);
    const service = createAboutClient('https://example.com/', () => null, vi.fn());
    await service.donations(2, false, new AbortController().signal);
    await service.donations(3, true, new AbortController().signal);
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.com/api/donation/list/page/vo');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1].body))).toEqual({
      current: 2,
      pageSize: 20,
      sortField: 'amount',
      sortOrder: 'descend',
    });
    expect(fetcher.mock.calls[1]?.[0]).toBe('https://example.com/api/donation/detail/list/page/vo');
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1].body))).toEqual({
      current: 3,
      pageSize: 10,
    });
  });
  it('preserves amount, purpose, remark and return URL when explicitly creating an order', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            tradeOrderId: 'synthetic-order',
            totalFee: 6.6,
            status: 'WP',
            urlQrcode: 'https://example.com/qr.png',
          },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const service = createAboutClient('https://example.com', () => null, vi.fn());
    const result = await service.createOrder(
      6.6,
      'synthetic remark',
      'https://example.com/rank/reward',
      new AbortController().signal,
    );
    expect(result.amount).toBe(6.6);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1].body))).toEqual({
      totalFee: 6.6,
      type: 1,
      remark: 'synthetic remark',
      returnUrl: 'https://example.com/rank/reward',
    });
  });
  it('reports expired authentication instead of presenting a successful operation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 40100 }))),
    );
    const expired = vi.fn();
    const service = createAboutClient('https://example.com', () => null, expired);
    await expect(service.order('synthetic-order', new AbortController().signal)).rejects.toThrow(
      '请登录',
    );
    expect(expired).toHaveBeenCalledOnce();
  });
  it('rejects invalid amounts and unsafe identifiers without making up a record', () => {
    expect(() => decodeOrder({ tradeOrderId: 'id', totalFee: -1 })).toThrow('金额');
    expect(() => decodeDonations({ records: [{ id: 9007199254740992 }], total: 1 })).toThrow(
      '编号',
    );
    expect(() => decodeDonations({ records: 'invalid' })).toThrow('榜单');
  });
  it('blocks executable payment URLs', () => {
    const order = decodeOrder({
      tradeOrderId: 'id',
      totalFee: 1,
      payUrl: 'javascript:alert(1)',
      urlQrcode: 'data:text/html,bad',
    });
    expect(order.payUrl).toBe('');
    expect(order.qrCode).toBe('');
  });
});
