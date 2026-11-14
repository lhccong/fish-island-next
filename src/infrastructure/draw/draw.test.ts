import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDrawClient } from './client';
import { createDrawChannel } from './channel';
import { room, image } from './decode';
const signal = () => new AbortController().signal;
const token = { name: 'synthetic-session', value: 'synthetic-token' };
afterEach(() => vi.unstubAllGlobals());
describe('绘画旧协议边界', () => {
  it('房间解析保留轮换与权限所需身份，拒绝异常数据与非 PNG', () => {
    const source = {
      roomId: 'r1',
      creatorId: '1',
      status: 'PLAYING',
      currentDrawerId: '2',
      participants: [{ userId: '2', userName: '合成画家', score: 10 }],
      currentRound: 2,
      totalRounds: 6,
    };
    expect(room(source)).toMatchObject({
      drawerId: '2',
      creatorId: '1',
      round: 2,
      rounds: 6,
      players: [{ id: '2', score: 10 }],
    });
    expect(() => room({ ...source, status: 'NEW' })).toThrow();
    expect(() =>
      room({ ...source, participants: [...source.participants, ...source.participants] }),
    ).toThrow();
    expect(() => image('https://example.com/private.png')).toThrow();
    expect(() => image('data:image/svg+xml;base64,abc')).toThrow();
    expect(() => room({ ...source, roundEndTime: NaN })).toThrow();
  });
  it('HTTP 鉴权、查询参数、消息包装和画布保存兼容旧接口', async () => {
    const responses: unknown[] = [
      'r1',
      true,
      true,
      {
        userId: '1',
        userName: '合成玩家',
        guessWord: '苹果',
        isCorrect: true,
        guessTime: '2026-11-14T00:00:00Z',
      },
    ];
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ code: 0, data: responses.shift() })),
    );
    vi.stubGlobal('fetch', fetcher);
    const client = createDrawClient('https://example.com/', () => token, vi.fn());
    expect(
      await client.create(
        { maxPlayers: 8, totalRounds: 6, creatorOnlyMode: false, wordType: 'hero' },
        signal(),
      ),
    ).toBe('r1');
    await client.action('next-round', 'r1', signal());
    await client.save('r1', 'data:image/png;base64,AA==', signal());
    expect(
      await client.guess('r1', '苹果', { id: '1', name: '合成玩家', avatarUrl: null }, signal()),
    ).toMatchObject({ correct: true, word: '苹果' });
    const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
    expect(calls[1]![0]).toBe('https://example.com/api/draw/game/next-round?roomId=r1');
    expect(calls[1]![1].method).toBe('POST');
    expect(new Headers(calls[0]![1].headers).get(token.name)).toBe(token.value);
    expect(JSON.parse(String(calls[2]![1].body))).toEqual({
      roomId: 'r1',
      drawData: 'data:image/png;base64,AA==',
    });
    expect(JSON.parse(String(calls[3]![1].body)).messageWrapper.message).toMatchObject({
      roomId: 'r1',
      content: '苹果',
      sender: { id: '1' },
    });
  });
  it('未登录不发送请求，过期通知认证层，未确认成功保留失败', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ code: 40100 })));
    vi.stubGlobal('fetch', fetcher);
    const expired = vi.fn();
    await expect(createDrawClient('', () => null, expired).rooms(signal())).rejects.toThrow('登录');
    expect(fetcher).not.toHaveBeenCalled();
    const client = createDrawClient('', () => token, expired);
    await expect(client.rooms(signal())).rejects.toThrow('登录已过期');
    expect(expired).toHaveBeenCalledOnce();
    fetcher.mockImplementation(async () => new Response(JSON.stringify({ code: 0, data: false })));
    await expect(client.action('join', 'r1', signal())).rejects.toThrow('未确认');
  });
  it('实时事件按房间路由，释放订阅并拒绝异常消息', () => {
    const channel = createDrawChannel();
    const refresh = vi.fn();
    const message = vi.fn();
    const off = channel.port.subscribe(refresh);
    const offMessage = channel.port.messages(message);
    channel.receive(JSON.stringify({ type: 'refreshDraw', data: 'r1' }));
    expect(refresh).toHaveBeenLastCalledWith('r1');
    channel.receive({
      type: 'draw',
      data: {
        message: {
          roomId: 'r1',
          sender: { id: '1', name: '合成玩家' },
          timestamp: '2026-11-14T00:00:00Z',
          content: '猜猜看',
        },
      },
    });
    expect(message).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'r1', content: '猜猜看' }),
    );
    channel.receive({
      type: 'draw',
      data: {
        message: { roomId: 'r1', sender: { id: '1' }, timestamp: 'invalid', content: '无效' },
      },
    });
    channel.receive({ type: 'undercover', data: 'other' });
    expect(message).toHaveBeenCalledTimes(1);
    off();
    offMessage();
    refresh.mockClear();
    channel.receive({ type: 'refreshDraw', data: 'r1' });
    expect(refresh).not.toHaveBeenCalled();
  });
});
