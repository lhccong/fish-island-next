import { createStore } from 'zustand/vanilla';
import {
  chooseMove,
  placeStone,
  validRoomId,
  type ConnectionStatus,
  type GomokuEvent,
  type GomokuPort,
  type Move,
  type Point,
  type Stone,
} from '@/domain/gomoku';
import { initialGameState, playMove, replayWatchSnapshot, type GameState } from './game-state';

export function createGomokuController(port: GomokuPort) {
  const store = createStore<GameState>(() => initialGameState(port.status()));
  let operation: ReturnType<typeof setTimeout> | undefined;
  let ai: ReturnType<typeof setTimeout> | undefined;
  let reminder: ReturnType<typeof setTimeout> | undefined;
  let release: (() => void) | undefined;
  let accountId = '';
  let watchRequest = 0;
  const clear = () => {
    clearTimeout(operation);
    clearTimeout(ai);
    clearTimeout(reminder);
  };
  const interrupt = (error: string) => {
    clear();
    store.setState({ phase: 'interrupted', error, thinking: false, notice: '' });
  };
  const releaseRoom = (s: GameState) => {
    if (s.roomId && (s.spectatable || s.mode === 'spectator'))
      port.send({ type: 'leave', roomId: s.roomId });
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
    const next = playMove(store.getState(), move);
    if (!next) return false;
    store.setState(next);
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
  const receiveWatch = (s: GameState, event: GomokuEvent) => {
    if (!('roomId' in event) || event.roomId !== s.roomId) return;
    if (event.type === 'watched' || event.type === 'watchError') {
      if (s.phase !== 'loading-watch' || event.requestId !== String(watchRequest)) return;
      clearTimeout(operation);
      if (event.type === 'watchError') {
        store.setState({ phase: 'lobby', error: event.message });
        return;
      }
      const snapshot = replayWatchSnapshot(s, event);
      if (!snapshot) {
        releaseRoom(s);
        store.setState({ phase: 'lobby', error: '棋谱校验失败，请重新观战。' });
        return;
      }
      store.setState(snapshot);
    } else if (event.type === 'watchMove' && s.phase === 'playing') {
      if (event.number <= s.moves.length) return;
      if (event.number !== s.moves.length + 1 || !apply(event.move)) {
        releaseRoom(s);
        interrupt('观战同步中断，请重新观战。');
      }
    } else if (event.type === 'roomClosed' && s.watchedPlayers) {
      store.setState({ spectatable: false });
      if (s.phase === 'finished') store.setState({ notice: '棋手已离开房间。' });
      else interrupt('棋手已离开，观战结束。');
    }
  };
  const receive = (event: GomokuEvent) => {
    const s = store.getState();
    if (s.mode === 'spectator') {
      receiveWatch(s, event);
      return;
    }
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
      store.setState({
        phase: 'waiting',
        roomId: event.roomId,
        spectatable: event.spectatable === true,
        error: '',
      });
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
        opponentAvatar: event.opponentAvatar ?? null,
        spectatable: event.spectatable === true,
        error: '',
      });
      remind();
    } else if (event.type === 'move') {
      if (s.phase !== 'playing' || event.roomId !== s.roomId || event.move.player === s.color)
        return;
      if (s.board[event.move.row]?.[event.move.col] === event.move.player) return;
      if (s.turn !== event.move.player || !apply(event.move))
        interrupt('双方棋盘顺序不一致，请退出后重新建房。');
    } else if (s.spectatable && event.roomId === s.roomId) {
      if (event.type === 'roomClosed') {
        store.setState({ spectatable: false });
        if (s.phase === 'playing') interrupt('对方已离开房间，请重新建房。');
      }
      if (event.type === 'moveRejected' && ['playing', 'finished'].includes(s.phase))
        interrupt(event.message);
    }
  };
  const connection = (value: ConnectionStatus) => {
    const s = store.getState();
    store.setState({ connection: value });
    if (value === 'closed' || value === 'unauthorized') {
      clear();
      store.setState(initialGameState(value), true);
    } else if (value !== 'connected' && s.mode === 'spectator') {
      const error = '观战连接已中断，恢复连接后可重新观战。';
      if (s.phase === 'loading-watch') {
        clearTimeout(operation);
        store.setState({ phase: 'lobby', error });
      } else if (s.phase === 'playing') interrupt(error);
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
    releaseRoom(s);
    store.setState(
      {
        ...initialGameState(s.connection),
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
  const watch = (input: string) => {
    const s = store.getState();
    const roomId = input.trim();
    if (!['lobby', 'finished', 'interrupted'].includes(s.phase)) return;
    if (port.status() !== 'connected' || !validRoomId(roomId)) {
      store.setState({
        error: !validRoomId(roomId) ? '请输入有效的房间号。' : '尚未连接，请稍后重试。',
      });
      return;
    }
    clear();
    if (s.roomId !== roomId || s.mode !== 'spectator') releaseRoom(s);
    const requestId = String(++watchRequest);
    store.setState(
      { ...initialGameState(s.connection), mode: 'spectator', phase: 'loading-watch', roomId },
      true,
    );
    if (!port.send({ type: 'watch', roomId, requestId })) {
      store.setState({ phase: 'lobby', error: '未能发送观战请求，请检查连接后重试。' });
      return;
    }
    if (store.getState().phase === 'loading-watch')
      operation = setTimeout(() => {
        releaseRoom(store.getState());
        store.setState({ phase: 'lobby', error: '观战请求超时，请重试。' });
      }, 12000);
  };
  return {
    store,
    start(userId: string) {
      if (accountId && accountId !== userId) {
        clear();
        store.setState(initialGameState(port.status()), true);
      }
      accountId = userId;
      if (!release) release = port.subscribe(receive, connection);
    },
    create: () => startOnline(),
    join: (roomId: string) => startOnline(roomId),
    watch,
    single(color: Stone) {
      clear();
      releaseRoom(store.getState());
      store.setState(
        { ...initialGameState(port.status()), mode: 'single', phase: 'playing', color },
        true,
      );
      scheduleAi();
    },
    move(point: Point) {
      const s = store.getState();
      if (
        s.mode === 'spectator' ||
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
      releaseRoom(store.getState());
      store.setState(initialGameState(port.status()), true);
    },
    reset() {
      clear();
      accountId = '';
      store.setState(initialGameState(port.status()), true);
    },
    dispose() {
      clear();
      release?.();
      release = undefined;
    },
  };
}
export type GomokuController = ReturnType<typeof createGomokuController>;
