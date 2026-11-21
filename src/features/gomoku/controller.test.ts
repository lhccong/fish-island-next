import { afterEach, expect, it, vi } from 'vitest';
import type { ConnectionStatus, GomokuEvent, GomokuPort, Stone } from '@/domain/gomoku';
import { createGomokuController } from './controller';

afterEach(() => vi.useRealTimers());
function fixture() {
  vi.useFakeTimers();
  let event!: (event: GomokuEvent) => void;
  let status!: (state: ConnectionStatus) => void;
  let connected: ConnectionStatus = 'connected';
  const send = vi.fn(() => true);
  const release = vi.fn();
  const port: GomokuPort = {
    send,
    status: () => connected,
    subscribe: (e, s) => {
      event = e;
      status = s;
      return release;
    },
  };
  const game = createGomokuController(port);
  game.start('101');
  return {
    game,
    send,
    release,
    event: (e: GomokuEvent) => event(e),
    state: (s: ConnectionStatus) => {
      connected = s;
      status(s);
    },
    play(color: 'black' | 'white' = 'black') {
      game.join('room-1');
      event({
        type: 'joined',
        roomId: 'room-1',
        color,
        opponentId: '202',
        opponentName: '合成岛友',
      });
    },
  };
}
it('requires room confirmation, deduplicates remote moves and never schedules AI in an online game', () => {
  const f = fixture();
  f.game.create();
  f.game.create();
  expect(f.send).toHaveBeenCalledTimes(1);
  f.event({ type: 'created', roomId: 'room-1' });
  expect(f.game.move({ row: 7, col: 7 })).toBe(false);
  f.event({
    type: 'joined',
    roomId: 'wrong-room',
    color: 'black',
    opponentId: '202',
    opponentName: '合成',
  });
  expect(f.game.store.getState().phase).toBe('waiting');
  f.event({
    type: 'joined',
    roomId: 'room-1',
    color: 'black',
    opponentId: '202',
    opponentName: '合成',
  });
  expect(f.game.move({ row: 7, col: 7 })).toBe(true);
  expect(f.game.move({ row: 7, col: 8 })).toBe(false);
  vi.advanceTimersByTime(1000);
  expect(f.game.store.getState().moves).toHaveLength(1);
  const remote: GomokuEvent = {
    type: 'move',
    roomId: 'room-1',
    move: { row: 8, col: 7, player: 'white' },
  };
  f.event({ ...remote, roomId: 'old-room' });
  expect(f.game.store.getState().moves).toHaveLength(1);
  f.event(remote);
  f.event(remote);
  expect(f.game.store.getState().moves).toHaveLength(2);
  expect(f.game.store.getState().turn).toBe('black');
  f.game.dispose();
  expect(f.release).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it('plays both colors and freezes on out-of-order or occupied remote coordinates', () => {
  const f = fixture();
  f.play('white');
  expect(f.game.move({ row: 0, col: 0 })).toBe(false);
  f.event({ type: 'move', roomId: 'room-1', move: { row: 0, col: 0, player: 'black' } });
  expect(f.game.move({ row: 0, col: 0 })).toBe(false);
  expect(f.game.move({ row: 0, col: 1 })).toBe(true);
  f.event({ type: 'move', roomId: 'room-1', move: { row: 0, col: 1, player: 'black' } });
  expect(f.game.store.getState().phase).toBe('interrupted');
  f.game.dispose();
});
it('ends a five in a row, ignores late moves and clears all timers', () => {
  const f = fixture();
  f.play();
  for (let col = 0; col < 5; col++) {
    f.game.move({ row: 7, col });
    if (col < 4)
      f.event({ type: 'move', roomId: 'room-1', move: { row: 8, col, player: 'white' } });
  }
  expect(f.game.store.getState()).toMatchObject({ phase: 'finished', winner: 'black' });
  expect(f.game.store.getState().line).toHaveLength(5);
  expect(vi.getTimerCount()).toBe(0);
  f.event({ type: 'move', roomId: 'room-1', move: { row: 8, col: 4, player: 'white' } });
  expect(f.game.store.getState().moves).toHaveLength(9);
  f.game.dispose();
});
it('declares a full board draw rather than leaving the game playable', () => {
  const f = fixture();
  f.play();
  const board: (Stone | null)[][] = Array.from({ length: 15 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) =>
      (row + Math.floor(col / 2)) % 2 ? ('white' as const) : ('black' as const),
    ),
  );
  board[14]![14] = null;
  f.game.store.setState({
    board,
    moves: Array.from({ length: 224 }, (_, i) => ({
      row: Math.floor(i / 15),
      col: i % 15,
      player: 'black' as const,
    })),
  });
  f.game.move({ row: 14, col: 14 });
  expect(f.game.store.getState().winner).toBe('draw');
  f.game.dispose();
});
it('interrupts on disconnect, keeps the board for review, never resumes on reconnect and clears account state', () => {
  const f = fixture();
  f.play();
  f.game.move({ row: 7, col: 7 });
  f.state('offline');
  f.state('connected');
  expect(f.game.store.getState().phase).toBe('interrupted');
  expect(f.game.store.getState().moves).toHaveLength(1);
  expect(f.game.move({ row: 1, col: 1 })).toBe(false);
  f.game.start('303');
  expect(f.game.store.getState()).toMatchObject({ phase: 'lobby', roomId: '', moves: [] });
  f.game.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it('handles timeout, server error, send failure and self-join without accepting late success', () => {
  const f = fixture();
  f.game.create();
  vi.advanceTimersByTime(12000);
  expect(f.game.store.getState().error).toContain('超时');
  f.event({ type: 'created', roomId: 'late' });
  expect(f.game.store.getState().phase).toBe('lobby');
  f.game.join('bad room');
  expect(f.send).toHaveBeenCalledTimes(1);
  f.game.join('missing');
  f.event({ type: 'error', message: '房间不存在或已开始' });
  expect(f.game.store.getState().error).toBe('房间不存在或已开始');
  f.game.join('self');
  f.event({
    type: 'joined',
    roomId: 'self',
    color: 'white',
    opponentId: '101',
    opponentName: '合成',
  });
  expect(f.game.store.getState().phase).toBe('interrupted');
  f.game.leave();
  f.send.mockReturnValue(false);
  f.game.create();
  expect(f.game.store.getState().error).toContain('发送失败');
  f.game.dispose();
});
it('runs AI only in single player and cancels it on leave, mode/account changes or disposal', () => {
  const f = fixture();
  f.game.single('white');
  expect(f.game.store.getState().thinking).toBe(true);
  vi.advanceTimersByTime(350);
  expect(f.game.store.getState().moves).toHaveLength(1);
  expect(f.game.store.getState().turn).toBe('white');
  f.game.move({ row: 7, col: 8 });
  f.game.leave();
  vi.advanceTimersByTime(1000);
  expect(f.game.store.getState().moves).toEqual([]);
  expect(f.send).not.toHaveBeenCalled();
  f.game.single('white');
  f.game.reset();
  vi.advanceTimersByTime(350);
  expect(f.game.store.getState().moves).toEqual([]);
  f.game.dispose();
});
it('reminds after 30 seconds without declaring a timeout loss, and ignores events after leaving', () => {
  const f = fixture();
  f.play();
  vi.advanceTimersByTime(30000);
  expect(f.game.store.getState().notice).toContain('轮到你');
  expect(f.game.store.getState().winner).toBeNull();
  f.game.move({ row: 0, col: 0 });
  vi.advanceTimersByTime(30000);
  expect(f.game.store.getState().notice).toContain('不会自动判负');
  f.game.leave();
  f.event({ type: 'move', roomId: 'room-1', move: { row: 8, col: 7, player: 'white' } });
  expect(f.game.store.getState().moves).toEqual([]);
  f.game.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

const watchSnapshot = {
  type: 'watched',
  roomId: 'g-synthetic',
  requestId: '1',
  players: { black: { name: '黑方岛友', avatar: null }, white: { name: '白方岛友', avatar: null } },
  moves: [{ row: 7, col: 7, player: 'black' }],
} as const;

it('opens the original invitation as a spectator when the server replies with a matching score', () => {
  const f = fixture();
  f.game.enter(watchSnapshot.roomId);
  expect(f.send).toHaveBeenCalledWith({
    type: 'join',
    roomId: watchSnapshot.roomId,
    watchRequestId: '1',
  });
  f.event({ ...watchSnapshot, requestId: 'old' });
  expect(f.game.store.getState().phase).toBe('joining');
  f.event(watchSnapshot);
  expect(f.game.store.getState()).toMatchObject({
    mode: 'spectator',
    phase: 'playing',
    moves: watchSnapshot.moves,
  });
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  f.game.dispose();
});

it('preserves old invitation joins and refuses to send watch commands for legacy rooms', () => {
  const f = fixture();
  f.game.watch('12345');
  expect(f.send).not.toHaveBeenCalled();
  expect(f.game.store.getState()).toMatchObject({ phase: 'lobby', roomId: '12345' });
  expect(f.game.store.getState().error).toContain('旧版协议');
  f.game.enter('12345');
  expect(f.send).toHaveBeenCalledWith({ type: 'join', roomId: '12345' });
  f.game.dispose();
});

it('hydrates the current watch request and applies numbered moves without sending moves as a spectator', () => {
  const f = fixture();
  f.game.watch(watchSnapshot.roomId);
  f.event(watchSnapshot);
  expect(f.game.store.getState()).toMatchObject({
    mode: 'spectator',
    phase: 'playing',
    turn: 'white',
  });
  const white = { row: 8, col: 7, player: 'white' } as const;
  const update = {
    type: 'watchMove',
    roomId: watchSnapshot.roomId,
    number: 2,
    move: white,
  } as const;
  f.event({ ...update, roomId: 'other' });
  f.event(update);
  f.event(update);
  expect(f.game.store.getState().moves).toHaveLength(2);
  expect(f.game.move({ row: 1, col: 1 })).toBe(false);
  expect(f.send).toHaveBeenCalledTimes(1);
  f.event({ ...update, number: 4 });
  expect(f.game.store.getState()).toMatchObject({
    phase: 'interrupted',
    moves: [...watchSnapshot.moves, white],
  });
  expect(f.send).toHaveBeenLastCalledWith({ type: 'leave', roomId: watchSnapshot.roomId });
  f.game.dispose();
});

it('ignores timed-out snapshots and can rejoin from a fresh snapshot after reconnecting', () => {
  const f = fixture();
  f.game.watch(watchSnapshot.roomId);
  vi.advanceTimersByTime(12000);
  expect(f.game.store.getState()).toMatchObject({
    phase: 'lobby',
    error: '观战请求超时，请重试。',
  });
  expect(f.send).toHaveBeenLastCalledWith({ type: 'leave', roomId: watchSnapshot.roomId });
  f.game.watch(watchSnapshot.roomId);
  f.event(watchSnapshot);
  expect(f.game.store.getState().phase).toBe('loading-watch');
  f.event({ ...watchSnapshot, requestId: '2' });
  f.state('reconnecting');
  f.state('connected');
  expect(f.game.store.getState().phase).toBe('interrupted');
  f.game.watch(watchSnapshot.roomId);
  f.event({ ...watchSnapshot, requestId: '3', moves: [] });
  expect(f.game.store.getState()).toMatchObject({ phase: 'playing', moves: [] });
  f.game.leave();
  f.event({ ...watchSnapshot, requestId: '3' });
  expect(f.game.store.getState().phase).toBe('lobby');
  expect(vi.getTimerCount()).toBe(0);
  f.game.dispose();
});
