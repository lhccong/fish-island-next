import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPointsShopClient } from './index';
import { decodeBubbles, decodeItem, decodePage, decodePointsRecord } from './decode';

afterEach(() => vi.unstubAllGlobals());
describe('积分商城协议', () => {
  it('只解码受支持的气泡，校验兑换回执和恢复默认的请求', async () => {
    const item = {
      id: 'berry-cat-paw',
      name: '草莓猫爪',
      points: 300,
      durationDays: 30,
      equipped: false,
      expiresAt: '2026-12-19T00:00:00Z',
    };
    expect(decodeBubbles([item, { id: 'future-design' }])).toEqual([
      { ...item, expiresAt: Date.parse(item.expiresAt) },
    ]);
    expect(() => decodeBubbles([item, item])).toThrow('气泡权益格式异常');
    expect(() => decodeBubbles([{ ...item, equipped: true, expiresAt: null }])).toThrow();
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ code: 0, data: [item] }))),
      );
    vi.stubGlobal('fetch', fetchMock);
    const port = createPointsShopClient(
      'https://shop.test',
      () => ({ name: 'synthetic-session', value: 'synthetic' }),
      vi.fn(),
    );
    const { signal } = new AbortController();
    await expect(port.exchangeBubble('tide-letter', 300, signal)).rejects.toThrow('未确认气泡权益');
    await expect(port.exchangeBubble('berry-cat-paw', 300, signal)).resolves.toHaveLength(1);
    expect(fetchMock.mock.calls[1]).toMatchObject([
      'https://shop.test/api/chat/bubble/exchange',
      { method: 'POST', body: '{"bubbleId":"berry-cat-paw","expectedPoints":300}' },
    ]);
    await port.equipBubble(null, signal);
    expect(fetchMock.mock.calls[2]).toMatchObject([
      'https://shop.test/api/chat/bubble/equip',
      { method: 'POST', body: '{"bubbleId":null}' },
    ]);
  });
  it('接受后台新款及其价格，但过滤无安全图片的新款', () => {
    const artwork = {
      imageUrl: 'https://assets.test/kite.svg',
      darkImageUrl: 'https://assets.test/kite-dark.svg',
      textTone: 'theme',
    };
    const item = {
      id: 'cloud-kite',
      name: '云上风筝',
      points: 425,
      durationDays: 30,
      expiresAt: null,
      equipped: false,
      artwork,
    };
    expect(decodeBubbles([item])).toEqual([item]);
    expect(decodeBubbles([{ ...item, artwork: { imageUrl: 'javascript:alert(1)' } }])).toEqual([]);
  });
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
  it.each([
    { used: -200, available: 1200 },
    { used: 0, available: 1000 },
    { used: 200, available: 800 },
    { used: 1200, available: -200 },
  ])('使用积分 $used 时按等级积分减使用积分得到 $available', ({ used, available }) => {
    const value = {
      id: '1',
      changeType: 1,
      changePoints: 10,
      afterPoints: 1000,
      afterUsedPoints: used,
    };
    expect(decodePointsRecord(value)).toMatchObject({ change: 10, available });
    expect(decodePointsRecord({ ...value, changeType: 2 })).toMatchObject({
      change: -10,
      available,
    });
  });
  it('允许负使用积分，仍拒绝非法快照、负变动数量和负等级积分', () => {
    const value = {
      id: '1',
      changeType: 1,
      changePoints: 10,
      afterPoints: 1000,
      afterUsedPoints: -200,
    };
    for (const used of [
      undefined,
      null,
      '',
      '-200',
      true,
      0.5,
      NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MIN_SAFE_INTEGER - 1,
    ])
      expect(() => decodePointsRecord({ ...value, afterUsedPoints: used })).toThrow('积分数据异常');
    expect(() => decodePointsRecord({ ...value, changePoints: -10 })).toThrow('积分数据异常');
    expect(() => decodePointsRecord({ ...value, afterPoints: -1 })).toThrow('积分数据异常');
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
