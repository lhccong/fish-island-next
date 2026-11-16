import { describe, expect, it } from 'vitest';
import { decodeLandlords } from './decode';
import { createLandlordsChannel } from './index';
import { cardFace, emptyTable, mergeTable } from '@/domain/landlords';
describe('斗地主旧协议', () => {
  it('保留字符串身份和私有手牌，公共快照不清空手牌', () => {
    const e = decodeLandlords(
      JSON.stringify({
        type: 'gameStateUpdate',
        data: {
          roomId: 'room',
          phase: 'playing',
          handCards: [{ id: '♠A' }],
          players: [
            {
              userId: '9007199254740999',
              userName: '合成玩家',
              avatar: 'https://example.test/avatar.png',
              isReady: true,
            },
          ],
        },
      }),
    );
    expect(e?.type).toBe('state');
    if (e?.type !== 'state') throw new Error('missing state');
    let state = mergeTable(emptyTable(), e, '9007199254740999');
    expect(state.players[0]?.id).toBe('9007199254740999');
    expect(state.players[0]?.avatar).toBe('https://example.test/avatar.png');
    const publicState = decodeLandlords({
      type: 'gamePlayCards',
      data: { roomId: 'room', phase: 'playing', handCards: null },
    });
    if (!publicState) throw new Error('missing snapshot');
    state = mergeTable(state, publicState, '9007199254740999');
    expect(state.hand).toEqual(['♠A']);
  });
  it('校验错误、其他游戏和非法帧，不抛出异常', () => {
    expect(decodeLandlords('{broken')).toBeNull();
    expect(
      decodeLandlords({ type: 'gameRoomState', data: { gameType: 'LANDLORDS_LAIZI' } }),
    ).toBeNull();
    expect(decodeLandlords({ type: 'error', data: '合成出牌失败' })).toEqual({
      type: 'error',
      message: '合成出牌失败',
    });
    expect(decodeLandlords({ type: 'gameRoomState', code: -1, message: '失败' })).toEqual({
      type: 'error',
      message: '失败',
    });
  });
  it('托管不清空出牌，新轮次清空牌面，缺失积分不伪造为零', () => {
    const s = emptyTable();
    s.players = [
      {
        id: '1',
        name: '合成玩家',
        ready: true,
        online: true,
        robot: false,
        owner: true,
        count: 2,
        played: ['♠3'],
      },
    ];
    expect(
      mergeTable(s, { type: 'played', id: '1', cards: [], message: '', robot: true }, '1')
        .players[0]?.played,
    ).toEqual(['♠3']);
    const reset = decodeLandlords({ type: 'gameStateUpdate', data: { phase: 'waiting' } });
    expect(reset?.type === 'state' && reset.patch.hand).toEqual([]);
    const result = decodeLandlords({
      type: 'gameActionResult',
      data: { event: 'GAME_OVER', players: [{ userId: '1', isWinner: true }] },
    });
    expect(result?.type === 'state' && result.patch.result?.players[0]?.score).toBeNull();
  });
  it('复用外部连接并释放订阅，发送嵌套字符串协议', () => {
    const channel = createLandlordsChannel();
    const frames: unknown[] = [];
    expect(channel.port.send('1', 'gameReady')).toBe(false);
    channel.connection('connected', (frame) => {
      frames.push(frame);
      return true;
    });
    expect(channel.port.send('1', 'gamePlayCards', { pokers: ['♠3'] })).toBe(true);
    expect(frames[0]).toEqual({
      type: 2,
      userId: '1',
      data: JSON.stringify({ type: 'gamePlayCards', content: JSON.stringify({ pokers: ['♠3'] }) }),
    });
    let calls = 0;
    const stop = channel.port.subscribe(
      () => calls++,
      () => {},
    );
    stop();
    channel.receive({ type: 'gameRoomList', data: { rooms: [] } });
    expect(calls).toBe(0);
    expect(cardFace('♠2#1').rank).toBe(15);
    expect(cardFace('🃏大王').rank).toBe(17);
  });
});
