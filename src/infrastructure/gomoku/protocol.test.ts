import { expect, it } from 'vitest';
import { decodeGomokuEvent, encodeGomokuCommand } from './protocol';
import { createGomokuRelay } from './index';

const frame = (type: string, data: unknown) => JSON.stringify({ type, data });
it('preserves optional player snapshots and rejects unsafe avatars while accepting ID-only joins', () => {
  for (const info of [
    { userName: '合成棋友', userAvatar: 'https://example.test/avatar.png' },
    { name: '合成棋友', avatar: 'https://example.test/avatar.png' },
  ]) {
    expect(
      decodeGomokuEvent(
        frame('joinSuccess', {
          roomId: 'room-1',
          yourColor: 'black',
          playerId: '202',
          playerInfo: info,
        }),
      ),
    ).toMatchObject({
      opponentName: '合成棋友',
      opponentAvatar: 'https://example.test/avatar.png',
    });
  }
  expect(
    decodeGomokuEvent(
      frame('joinSuccess', {
        roomId: 'room-1',
        yourColor: 'white',
        playerId: '202',
        playerInfo: { userName: '', userAvatar: 'javascript:alert(1)' },
      }),
    ),
  ).toMatchObject({ opponentName: '岛友', opponentAvatar: null });
});
it('decodes both create formats and validates joins, game type and remote coordinates', () => {
  for (const data of ['12345', { roomId: '12345', gameType: 'normal' }])
    expect(decodeGomokuEvent(frame('createChessRoom', data))).toEqual({
      type: 'created',
      roomId: '12345',
    });
  expect(
    decodeGomokuEvent(
      frame('joinSuccess', { roomId: '12345', yourColor: 'white', playerId: '987654321098765432' }),
    ),
  ).toMatchObject({ color: 'white', opponentId: '987654321098765432' });
  expect(
    decodeGomokuEvent(
      frame('moveChess', { roomId: '12345', player: 'black', position: { row: 14, col: 0 } }),
    ),
  ).toMatchObject({ type: 'move', move: { row: 14, col: 0, player: 'black' } });
  for (const data of [
    { roomId: '12345', player: 'black', position: { row: 15, col: 0 } },
    { roomId: '12345', player: 'black', position: { row: 1.5, col: 0 } },
    { roomId: '<script>', player: 'black', position: { row: 0, col: 0 } },
    { roomId: '12345', player: 'white', position: { row: 0, col: 0 }, gameType: 'chinese' },
  ])
    expect(decodeGomokuEvent(frame('moveChess', data))).toBeNull();
  for (const raw of [
    null,
    '{}',
    'bad json',
    frame('chat', {}),
    frame('joinSuccess', { roomId: '12345', yourColor: 'white', playerId: 'bad' }),
  ])
    expect(decodeGomokuEvent(raw)).toBeNull();
});
it('keeps the old envelope and string user identifiers without exposing credentials', () => {
  expect(encodeGomokuCommand({ type: 'create' })).toEqual({
    type: 2,
    userId: -1,
    data: { type: 'createChessRoom', content: { gameType: 'normal', spectatable: true } },
  });
  expect(encodeGomokuCommand({ type: 'join', roomId: '12345' })).toEqual({
    type: 2,
    userId: -1,
    data: { type: 'joinRoom', content: '12345' },
  });
  expect(encodeGomokuCommand({ type: 'join', roomId: 'g-synthetic', watchRequestId: '1' })).toEqual(
    {
      type: 2,
      userId: -1,
      data: { type: 'joinRoom', content: 'g-synthetic', watchRequestId: '1' },
    },
  );
  expect(
    encodeGomokuCommand({
      type: 'move',
      roomId: '12345',
      opponentId: '987654321098765432',
      move: { row: 1, col: 2, player: 'black' },
    }),
  ).toEqual({
    type: 2,
    userId: '987654321098765432',
    data: {
      type: 'moveChess',
      content: { roomId: '12345', position: { row: 1, col: 2 }, player: 'black' },
    },
  });
});
it('decodes bounded spectator snapshots and numbered updates', () => {
  const roomId = 'g-synthetic';
  const move = { row: 7, col: 7, player: 'black' };
  const snapshot = {
    roomId,
    requestId: '1',
    black: { name: '黑方岛友', avatar: 'https://example.test/avatar.png' },
    white: { name: '白方岛友', avatar: 'data:unsafe' },
    moves: [move],
  };
  expect(decodeGomokuEvent(frame('chessWatched', snapshot))).toEqual({
    type: 'watched',
    roomId,
    requestId: '1',
    players: { black: snapshot.black, white: { name: '白方岛友', avatar: null } },
    moves: [move],
  });
  expect(
    decodeGomokuEvent(frame('chessWatched', { ...snapshot, moves: [{ ...move, row: 15 }] })),
  ).toBeNull();
  expect(decodeGomokuEvent(frame('chessWatchMove', { roomId, number: 0, move }))).toBeNull();
  expect(decodeGomokuEvent(frame('chessWatchMove', { roomId, number: 1, move }))).toEqual({
    type: 'watchMove',
    roomId,
    number: 1,
    move,
  });
  expect(encodeGomokuCommand({ type: 'watch', roomId, requestId: '1' })).toMatchObject({
    type: 2,
    userId: -1,
    data: { type: 'watchChess', content: { roomId, requestId: '1' } },
  });
});
it('reuses the bound transport, stops sends offline and releases subscriptions', () => {
  const relay = createGomokuRelay();
  const events: unknown[] = [];
  const statuses: unknown[] = [];
  const sent: unknown[] = [];
  const release = relay.port.subscribe(
    (e) => events.push(e),
    (s) => statuses.push(s),
  );
  expect(relay.port.send({ type: 'create' })).toBe(false);
  relay.connection('connected', (value) => {
    sent.push(value);
    return true;
  });
  expect(relay.port.send({ type: 'create' })).toBe(true);
  relay.receive(frame('createChessRoom', '12345'));
  expect(events).toHaveLength(1);
  relay.connection('offline', null);
  expect(relay.port.send({ type: 'create' })).toBe(false);
  release();
  relay.receive(frame('createChessRoom', '23456'));
  expect(events).toHaveLength(1);
  expect(sent).toHaveLength(1);
  expect(statuses).toEqual(['connected', 'offline']);
});
