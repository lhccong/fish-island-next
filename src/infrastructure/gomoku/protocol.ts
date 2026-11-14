import { validPoint, validRoomId, type GomokuCommand, type GomokuEvent } from '@/domain/gomoku';
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
  if (frame.type === 'createChessRoom') return { type: 'created', roomId };
  if (
    frame.type === 'joinSuccess' &&
    (data?.yourColor === 'black' || data?.yourColor === 'white')
  ) {
    const opponentId = id(data.playerId);
    if (!/^\d{1,20}$/.test(opponentId)) return null;
    const info = object(data.playerInfo);
    return {
      type: 'joined',
      roomId,
      color: data.yourColor,
      opponentId,
      opponentName: typeof info?.name === 'string' ? info.name.slice(0, 100) : '岛友',
    };
  }
  if (frame.type === 'moveChess' && (data?.player === 'black' || data?.player === 'white')) {
    const point = object(data.position);
    if (
      typeof point?.row !== 'number' ||
      typeof point.col !== 'number' ||
      !validPoint({ row: point.row, col: point.col })
    )
      return null;
    return { type: 'move', roomId, move: { row: point.row, col: point.col, player: data.player } };
  }
  return null;
}
export function encodeGomokuCommand(command: GomokuCommand): unknown {
  return {
    type: 2,
    userId: command.type === 'move' ? command.opponentId : -1,
    data:
      command.type === 'create'
        ? { type: 'createChessRoom', content: { gameType: 'normal' } }
        : command.type === 'join'
          ? { type: 'joinRoom', content: command.roomId }
          : {
              type: 'moveChess',
              content: {
                roomId: command.roomId,
                position: { row: command.move.row, col: command.move.col },
                player: command.move.player,
              },
            },
  };
}
