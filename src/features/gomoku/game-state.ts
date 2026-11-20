import {
  emptyBoard,
  opposite,
  placeStone,
  winningLine,
  type Board,
  type ConnectionStatus,
  type GomokuEvent,
  type GomokuPlayer,
  type Move,
  type Point,
  type Stone,
} from '@/domain/gomoku';

export interface GameState {
  mode: 'online' | 'single' | 'spectator';
  phase:
    | 'lobby'
    | 'creating'
    | 'joining'
    | 'loading-watch'
    | 'waiting'
    | 'playing'
    | 'finished'
    | 'interrupted';
  connection: ConnectionStatus;
  roomId: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar: string | null;
  color: Stone;
  turn: Stone;
  board: Board;
  moves: readonly Move[];
  line: readonly Point[];
  winner: Stone | 'draw' | null;
  error: string;
  notice: string;
  thinking: boolean;
  spectatable: boolean;
  watchedPlayers: Record<Stone, GomokuPlayer> | null;
}

export function initialGameState(connection: ConnectionStatus): GameState {
  return {
    mode: 'online',
    phase: 'lobby',
    connection,
    roomId: '',
    opponentId: '',
    opponentName: '岛友',
    opponentAvatar: null,
    color: 'black',
    turn: 'black',
    board: emptyBoard(),
    moves: [],
    line: [],
    winner: null,
    error: '',
    notice: '',
    thinking: false,
    spectatable: false,
    watchedPlayers: null,
  };
}

export function playMove(state: GameState, move: Move): GameState | null {
  if (state.turn !== move.player || state.winner) return null;
  const board = placeStone(state.board, move, move.player);
  if (!board) return null;
  const moves = [...state.moves, move];
  const line = winningLine(board, move, move.player);
  const winner = line.length ? move.player : moves.length === board.length ** 2 ? 'draw' : null;
  return {
    ...state,
    board,
    moves,
    line,
    winner,
    phase: winner ? 'finished' : 'playing',
    turn: opposite(move.player),
    thinking: false,
    error: '',
  };
}

export function replayWatchSnapshot(
  state: GameState,
  event: Extract<GomokuEvent, { type: 'watched' }>,
): GameState | null {
  let snapshot: GameState = {
    ...state,
    phase: 'playing',
    spectatable: true,
    watchedPlayers: event.players,
  };
  for (const move of event.moves) {
    const next = playMove(snapshot, move);
    if (!next) return null;
    snapshot = next;
  }
  return snapshot;
}
