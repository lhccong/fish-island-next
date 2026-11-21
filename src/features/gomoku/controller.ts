import { createStore } from 'zustand/vanilla';
import {
  chooseMove,
  placeStone,
  supportsSpectators,
  validRoomId,
  type ConnectionStatus,
  type GomokuCommand,
  type GomokuEvent,
  type GomokuPort,
  type Move,
  type Point,
  type Stone,
} from '@/domain/gomoku';
import { initialGameState, playMove, replayWatchSnapshot, type GameState } from './game-state';

type RoomAction = 'create' | 'join' | 'invite' | 'watch';

export function createGomokuController(port: GomokuPort) {
  const store = createStore<GameState>(() => initialGameState(port.status()));
  let operation: ReturnType<typeof setTimeout> | undefined;
  let ai: ReturnType<typeof setTimeout> | undefined;
  let reminder: ReturnType<typeof setTimeout> | undefined;
  let release: (() => void) | undefined;
  let accountId = '';
  let roomRequest = 0;
  let pendingWatch: string | undefined;
  const clearOperation = () => {
    clearTimeout(operation);
    pendingWatch = undefined;
  };
  const failOperation = (error: string) => {
    clearOperation();
    store.setState({ phase: 'lobby', error });
  };
  const clear = () => {
    clearOperation();
    clearTimeout(ai);
    clearTimeout(reminder);
  };
  const interrupt = (error: string) => {
    clear();
    store.setState({ phase: 'interrupted', error, thinking: false, notice: '' });
  };
  const releaseRoom = (s: GameState) => {
    if (
      s.roomId &&
      (s.spectatable || pendingWatch || (s.mode === 'spectator' && s.phase !== 'lobby'))
    )
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
      if (event.requestId !== pendingWatch) return;
      if (event.type === 'watchError') {
        failOperation(event.message);
        return;
      }
      const snapshot = replayWatchSnapshot({ ...s, mode: 'spectator' }, event);
      if (!snapshot) {
        port.send({ type: 'leave', roomId: s.roomId });
        failOperation('棋谱校验失败，请重新观战。');
        return;
      }
      clearOperation();
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
    if (s.mode === 'spectator' || event.type === 'watched' || event.type === 'watchError') {
      receiveWatch(s, event);
      return;
    }
    if (s.mode !== 'online') return;
    if (event.type === 'error') {
      if (s.phase === 'creating' || s.phase === 'joining') failOperation(event.message);
      return;
    }
    if (event.type === 'created') {
      if (s.phase !== 'creating') return;
      clearOperation();
      store.setState({
        phase: 'waiting',
        roomId: event.roomId,
        spectatable: event.spectatable === true,
        error: '',
      });
    } else if (event.type === 'joined') {
      if (!['joining', 'waiting'].includes(s.phase) || event.roomId !== s.roomId) return;
      if (s.phase === 'joining' && event.requestId && event.requestId !== pendingWatch) return;
      clearOperation();
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
    } else if (value !== 'connected' && pendingWatch) {
      failOperation('进入房间时连接中断，恢复连接后可重试。');
    } else if (value !== 'connected' && s.mode === 'spectator' && s.phase === 'playing') {
      interrupt('观战连接已中断，恢复连接后可重新观战。');
    } else if (
      value !== 'connected' &&
      s.mode === 'online' &&
      ['creating', 'joining', 'waiting', 'playing'].includes(s.phase)
    )
      interrupt('连接已中断，当前棋局无法恢复。连接恢复后请重新建房。');
  };
  const openRoom = (action: RoomAction, input = '') => {
    const s = store.getState();
    const roomId = input.trim();
    if (!['lobby', 'finished', 'interrupted'].includes(s.phase)) return;
    if (action !== 'create' && !validRoomId(roomId)) {
      store.setState({ error: '请输入有效的房间号。' });
      return;
    }
    const watching = action === 'watch';
    if (watching && !supportsSpectators(roomId)) {
      store.setState({
        ...(s.phase === 'lobby' ? { roomId } : {}),
        error: '该房间使用旧版协议。请棋手更新后重新创建房间，再打开邀请链接。',
      });
      return;
    }
    if (port.status() !== 'connected') {
      store.setState({ error: '尚未连接，请等待连接恢复后重试。' });
      return;
    }
    clear();
    if (!watching || s.roomId !== roomId || s.mode !== 'spectator') releaseRoom(s);
    const requestId =
      watching || (action === 'invite' && supportsSpectators(roomId))
        ? String(++roomRequest)
        : undefined;
    pendingWatch = requestId;
    const phase = action === 'create' ? 'creating' : watching ? 'loading-watch' : 'joining';
    store.setState(
      { ...initialGameState(s.connection), phase, roomId, mode: watching ? 'spectator' : 'online' },
      true,
    );
    const command: GomokuCommand =
      action === 'create'
        ? { type: 'create' }
        : watching && requestId
          ? { type: 'watch', roomId, requestId }
          : { type: 'join', roomId, ...(requestId ? { watchRequestId: requestId } : {}) };
    if (!port.send(command)) {
      if (watching) failOperation('未能发送观战请求，请检查连接后重试。');
      else interrupt('发送失败，请检查连接后重试。');
      return;
    }
    if (store.getState().phase === phase)
      operation = setTimeout(() => {
        if (pendingWatch) port.send({ type: 'leave', roomId });
        failOperation(watching ? '观战请求超时，请重试。' : '房间请求超时，请重试。');
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
    create: () => openRoom('create'),
    join: (roomId: string) => openRoom('join', roomId),
    enter: (roomId: string) => openRoom('invite', roomId),
    watch: (roomId: string) => openRoom('watch', roomId),
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
      releaseRoom(store.getState());
      clear();
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
