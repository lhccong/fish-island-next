import { expect, it } from 'vitest';
import { decodeGomokuEvent, encodeGomokuCommand } from './protocol';
import { createGomokuRelay } from './index';

const frame = (type: string, data: unknown) => JSON.stringify({ type, data });
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
    data: { type: 'createChessRoom', content: { gameType: 'normal' } },
  });
  expect(encodeGomokuCommand({ type: 'join', roomId: '12345' })).toEqual({
    type: 2,
    userId: -1,
    data: { type: 'joinRoom', content: '12345' },
  });
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
