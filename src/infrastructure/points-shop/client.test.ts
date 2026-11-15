import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPointsShopClient } from './index';
import { decodeItem, decodePage, decodePointsRecord } from './decode';

afterEach(() => vi.unstubAllGlobals());
describe('积分商城协议', () => {
  it('映射旧道具编号并只开放已实现类型，拒绝非法价格与图片协议', () => {
    const item = {
      frameId: '90071992547409930',
      name: '月卡',
      type: '1',
      points: 100,
      imgUrl: 'javascript:alert(1)',
    };
    expect(decodeItem(item)).toMatchObject({
      id: item.frameId,
      points: 100,
      supported: true,
      imageUrl: '',
    });
    expect(decodeItem({ ...item, type: '2' }).supported).toBe(false);
    expect(() => decodeItem({ ...item, points: -1 })).toThrow();
    expect(() => decodeItem({ ...item, frameId: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(decodePage({ records: [], total: '0' }, decodeItem)).toEqual({ items: [], total: 0 });
  });
  it('兼容后端 Long 字符串总数，拒绝非法或超出安全精度的分页和价格', () => {
    for (const total of [0, '0', 25, '25'])
      expect(decodePage({ records: [], total }, decodeItem).total).toBe(Number(total));
    for (const total of [null, '', ' ', '1e2', '1.5', '-1', -1, true, '9007199254740992'])
      expect(() => decodePage({ records: [], total }, decodeItem)).toThrow();
    expect(() => decodeItem({ frameId: '1', name: '月卡', points: '100' })).toThrow();
  });
  it('流水使用服务端变动类型和结余', () => {
    const value = {
      id: '1',
      description: '兑换',
      changeType: 2,
      changePoints: 100,
      afterPoints: 1000,
      afterUsedPoints: 200,
    };
    expect(decodePointsRecord(value)).toMatchObject({ change: -100, available: 800 });
    expect(decodePointsRecord({ ...value, changeType: 1 }).change).toBe(100);
    expect(() => decodePointsRecord({ ...value, changeType: 3 })).toThrow();
  });
  it('沿用 GET 分页和 JSON 兑换协议，确认 true 才成功', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 0, data: { total: '0', records: [] } })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const port = createPointsShopClient(
      'https://shop.test/',
      () => ({ name: 'synthetic-session', value: 'synthetic' }),
      vi.fn(),
    );
    await port.items(2, new AbortController().signal);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://shop.test/api/props/list/page?current=2&pageSize=12',
    );
    expect(fetchMock.mock.calls[0]![1].headers.get('synthetic-session')).toBe('synthetic');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: 0, data: true })));
    await port.purchase('17', new AbortController().signal);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'POST', body: '{"propsId":"17"}' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: 0, data: false })));
    await expect(port.purchase('17', new AbortController().signal)).rejects.toThrow('未确认');
  });
  it('鉴权失败通知应用，缺少账号不发请求', async () => {
    const unauthorized = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 40100 }))),
    );
    const port = createPointsShopClient(
      'https://shop.test',
      () => ({ name: 'synthetic-session', value: 'synthetic' }),
      unauthorized,
    );
    await expect(port.records(1, new AbortController().signal)).rejects.toThrow('登录已过期');
    expect(unauthorized).toHaveBeenCalledOnce();
    const guest = createPointsShopClient('', () => null, unauthorized);
    await expect(guest.purchase('1', new AbortController().signal)).rejects.toThrow('请先登录');
  });
});
