import { createStore } from 'zustand/vanilla';
import {
  chooseMove,
  emptyBoard,
  opposite,
  placeStone,
  validRoomId,
  winningLine,
  type Board,
  type ConnectionStatus,
  type GomokuEvent,
  type GomokuPort,
  type Move,
  type Point,
  type Stone,
} from '@/domain/gomoku';

export interface GameState {
  mode: 'online' | 'single';
  phase: 'lobby' | 'creating' | 'joining' | 'waiting' | 'playing' | 'finished' | 'interrupted';
  connection: ConnectionStatus;
  roomId: string;
  opponentId: string;
  opponentName: string;
  color: Stone;
  turn: Stone;
  board: Board;
  moves: readonly Move[];
  line: readonly Point[];
  winner: Stone | 'draw' | null;
  error: string;
  notice: string;
  thinking: boolean;
}
const initial = (connection: ConnectionStatus): GameState => ({
  mode: 'online',
  phase: 'lobby',
  connection,
  roomId: '',
  opponentId: '',
  opponentName: '岛友',
  color: 'black',
  turn: 'black',
  board: emptyBoard(),
  moves: [],
  line: [],
  winner: null,
  error: '',
  notice: '',
  thinking: false,
});
export function createGomokuController(port: GomokuPort) {
  const store = createStore<GameState>(() => initial(port.status()));
  let operation: ReturnType<typeof setTimeout> | undefined;
  let ai: ReturnType<typeof setTimeout> | undefined;
  let reminder: ReturnType<typeof setTimeout> | undefined;
  let release: (() => void) | undefined;
  let accountId = '';
  const clear = () => {
    clearTimeout(operation);
    clearTimeout(ai);
    clearTimeout(reminder);
  };
  const interrupt = (error: string) => {
    clear();
    store.setState({ phase: 'interrupted', error, thinking: false, notice: '' });
  };
  const remind = () => {
    clearTimeout(reminder);
    store.setState({ notice: '' });
    if (store.getState().mode === 'online' && store.getState().phase === 'playing')
      reminder = setTimeout(() => {
        const s = store.getState();
        store.setState({
          notice:
            s.turn === s.color
              ? '轮到你了，点击棋盘即可落子。'
              : '对方已超过 30 秒未落子，可以继续等待；超时不会自动判负。',
        });
      }, 30000);
  };
  const apply = (move: Move) => {
    const s = store.getState();
    const board = placeStone(s.board, move, move.player);
    if (!board) return false;
    const moves = [...s.moves, move];
    const line = winningLine(board, move, move.player);
    const winner = line.length ? move.player : moves.length === 225 ? 'draw' : null;
    store.setState({
      board,
      moves,
      line,
      winner,
      phase: winner ? 'finished' : 'playing',
      turn: opposite(move.player),
      thinking: false,
      error: '',
    });
    remind();
    return true;
  };
  const scheduleAi = () => {
    const s = store.getState();
    if (s.mode !== 'single' || s.phase !== 'playing' || s.turn === s.color) return;
    store.setState({ thinking: true });
    ai = setTimeout(() => {
      const latest = store.getState();
      if (latest.mode !== 'single' || latest.phase !== 'playing' || latest.turn === latest.color)
        return;
      const point = chooseMove(latest.board, latest.turn);
      if (point) apply({ ...point, player: latest.turn });
    }, 350);
  };
  const receive = (event: GomokuEvent) => {
    const s = store.getState();
    if (s.mode !== 'online') return;
    if (event.type === 'error') {
      if (s.phase === 'creating' || s.phase === 'joining') {
        clearTimeout(operation);
        store.setState({ phase: 'lobby', error: event.message });
      }
      return;
    }
    if (event.type === 'created') {
      if (s.phase !== 'creating') return;
      clearTimeout(operation);
      store.setState({ phase: 'waiting', roomId: event.roomId, error: '' });
    } else if (event.type === 'joined') {
      if (!['joining', 'waiting'].includes(s.phase) || event.roomId !== s.roomId) return;
      clearTimeout(operation);
      if (event.opponentId === accountId) {
        interrupt('不能和自己的账号对局，请使用另一个账号加入。');
        return;
      }
      store.setState({
        phase: 'playing',
        color: event.color,
        opponentId: event.opponentId,
        opponentName: event.opponentName,
        board: emptyBoard(),
        moves: [],
        line: [],
        winner: null,
        turn: 'black',
        error: '',
      });
      remind();
    } else if (event.type === 'move') {
      if (s.phase !== 'playing' || event.roomId !== s.roomId || event.move.player === s.color)
        return;
      if (s.board[event.move.row]?.[event.move.col] === event.move.player) return;
      if (s.turn !== event.move.player || !apply(event.move))
        interrupt('双方棋盘顺序不一致，请退出后重新建房。');
    }
  };
  const connection = (value: ConnectionStatus) => {
    const s = store.getState();
    store.setState({ connection: value });
    if (value === 'closed' || value === 'unauthorized') {
      clear();
      store.setState(initial(value), true);
    } else if (
      value !== 'connected' &&
      s.mode === 'online' &&
      ['creating', 'joining', 'waiting', 'playing'].includes(s.phase)
    )
      interrupt('连接已中断，当前棋局无法恢复。连接恢复后请重新建房。');
  };
  const startOnline = (roomId?: string) => {
    const s = store.getState();
    if (!['lobby', 'finished', 'interrupted'].includes(s.phase)) return;
    if (port.status() !== 'connected') {
      store.setState({ error: '尚未连接，请等待连接恢复后重试。' });
      return;
    }
    if (roomId !== undefined && !validRoomId(roomId.trim())) {
      store.setState({ error: '请输入有效的房间号。' });
      return;
    }
    clear();
    store.setState(
      {
        ...initial(s.connection),
        phase: roomId === undefined ? 'creating' : 'joining',
        roomId: roomId?.trim() ?? '',
      },
      true,
    );
    if (
      !port.send(
        roomId === undefined ? { type: 'create' } : { type: 'join', roomId: roomId.trim() },
      )
    ) {
      interrupt('发送失败，请检查连接后重新建房。');
      return;
    }
    // A response can arrive synchronously in an adapter. Do not replace a confirmed state.
    if (['creating', 'joining'].includes(store.getState().phase))
      operation = setTimeout(() => {
        store.setState({
          phase: 'lobby',
          error: '房间请求超时，请重试。迟到的响应不会自动开始对局。',
        });
      }, 12000);
  };
  return {
    store,
    start(userId: string) {
      if (accountId && accountId !== userId) {
        clear();
        store.setState(initial(port.status()), true);
      }
      accountId = userId;
      if (!release) release = port.subscribe(receive, connection);
    },
    create: () => startOnline(),
    join: (roomId: string) => startOnline(roomId),
    single(color: Stone) {
      clear();
      store.setState({ ...initial(port.status()), mode: 'single', phase: 'playing', color }, true);
      scheduleAi();
    },
    move(point: Point) {
      const s = store.getState();
      if (
        s.phase !== 'playing' ||
        s.turn !== s.color ||
        s.thinking ||
        !placeStone(s.board, point, s.color)
      )
        return false;
      if (
        s.mode === 'online' &&
        !port.send({
          type: 'move',
          roomId: s.roomId,
          opponentId: s.opponentId,
          move: { ...point, player: s.color },
        })
      ) {
        interrupt('落子未发送，连接不可用，请重新建房。');
        return false;
      }
      apply({ ...point, player: s.color });
      scheduleAi();
      return true;
    },
    leave() {
      clear();
      store.setState(initial(port.status()), true);
    },
    reset() {
      clear();
      accountId = '';
      store.setState(initial(port.status()), true);
    },
    dispose() {
      clear();
      release?.();
      release = undefined;
    },
  };
}
export type GomokuController = ReturnType<typeof createGomokuController>;
