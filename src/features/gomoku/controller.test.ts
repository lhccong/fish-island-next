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
