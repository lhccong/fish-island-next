import {
  BOARD_SIZE,
  validPoint,
  validRoomId,
  type GomokuCommand,
  type GomokuEvent,
  type Move,
} from '@/domain/gomoku';
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const id = (value: unknown) =>
  typeof value === 'string'
    ? value
    : typeof value === 'number' && Number.isSafeInteger(value)
      ? String(value)
      : '';

function profile(info: Record<string, unknown> | null, fallback: string) {
  const name = info?.userName ?? info?.name;
  const avatar = info?.userAvatar ?? info?.avatar;
  return {
    name: typeof name === 'string' && name.trim() ? name.slice(0, 100) : fallback,
    avatar: typeof avatar === 'string' && /^https?:\/\//i.test(avatar) ? avatar : null,
  };
}

function decodeMove(point: unknown, player: unknown): Move | null {
  const position = object(point);
  if (
    (player !== 'black' && player !== 'white') ||
    typeof position?.row !== 'number' ||
    typeof position.col !== 'number' ||
    !validPoint({ row: position.row, col: position.col })
  )
    return null;
  return { row: position.row, col: position.col, player };
}

function decodeWatchEvent(
  type: unknown,
  roomId: string,
  data: Record<string, unknown>,
): GomokuEvent | null {
  if (type === 'chessWatchMove') {
    const number = data.number;
    const move = decodeMove(data.move, object(data.move)?.player);
    if (
      typeof number === 'number' &&
      Number.isInteger(number) &&
      number > 0 &&
      number <= BOARD_SIZE ** 2 &&
      move
    )
      return { type: 'watchMove', roomId, number, move };
  }
  const requestId = data.requestId;
  if (typeof requestId !== 'string' || !validRoomId(requestId)) return null;
  if (type === 'chessWatchError' && typeof data.message === 'string')
    return { type: 'watchError', roomId, requestId, message: data.message.slice(0, 200) };
  if (type !== 'chessWatched' || !Array.isArray(data.moves) || data.moves.length > BOARD_SIZE ** 2)
    return null;
  const black = object(data.black);
  const white = object(data.white);
  if (!black || !white) return null;
  const moves: Move[] = [];
  for (const entry of data.moves) {
    const move = decodeMove(entry, object(entry)?.player);
    if (!move) return null;
    moves.push(move);
  }
  return {
    type: 'watched',
    roomId,
    requestId,
    players: { black: profile(black, '黑方'), white: profile(white, '白方') },
    moves,
  };
}

export function decodeGomokuEvent(raw: unknown): GomokuEvent | null {
  if (typeof raw !== 'string' || raw.length > 16384) return null;
  let frame: Record<string, unknown> | null;
  try {
    frame = object(JSON.parse(raw));
  } catch {
    return null;
  }
  if (!frame) return null;
  const data = object(frame.data);
  if (frame.type === 'error' && typeof frame.data === 'string')
    return { type: 'error', message: frame.data.slice(0, 200) };
  const roomId = id(data?.roomId ?? frame.data);
  if (!validRoomId(roomId) || (data?.gameType !== undefined && data.gameType !== 'normal'))
    return null;
  const capability = data?.spectatable === true ? { spectatable: true as const } : {};
  if (frame.type === 'createChessRoom') return { type: 'created', roomId, ...capability };
  if (
    frame.type === 'joinSuccess' &&
    (data?.yourColor === 'black' || data?.yourColor === 'white')
  ) {
    const opponentId = id(data.playerId);
    if (!/^\d{1,20}$/.test(opponentId)) return null;
    const opponent = profile(object(data.playerInfo), '岛友');
    return {
      type: 'joined',
      roomId,
      color: data.yourColor,
      opponentId,
      opponentName: opponent.name,
      opponentAvatar: opponent.avatar,
      ...capability,
    };
  }
  if (frame.type === 'moveChess') {
    const move = decodeMove(data?.position, data?.player);
    return move ? { type: 'move', roomId, move } : null;
  }
  if (frame.type === 'chessRoomClosed') return { type: 'roomClosed', roomId };
  if (frame.type === 'chessMoveRejected' && typeof data?.message === 'string')
    return { type: 'moveRejected', roomId, message: data.message.slice(0, 200) };
  return data ? decodeWatchEvent(frame.type, roomId, data) : null;
}
export function encodeGomokuCommand(command: GomokuCommand): unknown {
  const frame = (type: string, content: unknown, userId: string | number = -1) => ({
    type: 2,
    userId,
    data: { type, content },
  });
  switch (command.type) {
    case 'create':
      return frame('createChessRoom', { gameType: 'normal', spectatable: true });
    case 'join':
      return frame('joinRoom', command.roomId);
    case 'watch':
      return frame('watchChess', { roomId: command.roomId, requestId: command.requestId });
    case 'leave':
      return frame('leaveChessRoom', command.roomId);
    case 'move':
      return frame(
        'moveChess',
        {
          roomId: command.roomId,
          position: { row: command.move.row, col: command.move.col },
          player: command.move.player,
        },
        command.opponentId,
      );
  }
}
