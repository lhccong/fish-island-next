export type Stone = 'black' | 'white';
export interface Point {
  row: number;
  col: number;
}
export interface Move extends Point {
  player: Stone;
}
export type Board = readonly (readonly (Stone | null)[])[];
export const BOARD_SIZE = 15;
export const opposite = (stone: Stone): Stone => (stone === 'black' ? 'white' : 'black');
export const coordinate = ({ row, col }: Point) => `${String.fromCharCode(65 + col)}${15 - row}`;
export function validPoint(point: Point) {
  return (
    Number.isInteger(point.row) &&
    Number.isInteger(point.col) &&
    point.row >= 0 &&
    point.row < BOARD_SIZE &&
    point.col >= 0 &&
    point.col < BOARD_SIZE
  );
}
export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Stone | null>(BOARD_SIZE).fill(null));
}
export function placeStone(board: Board, point: Point, player: Stone): Board | null {
  if (!validPoint(point) || board[point.row]?.[point.col] !== null) return null;
  return board.map((row, index) =>
    index === point.row ? row.map((cell, col) => (col === point.col ? player : cell)) : row,
  );
}
export function winningLine(board: Board, point: Point, player: Stone): readonly Point[] {
  if (!validPoint(point) || board[point.row]?.[point.col] !== player) return [];
  for (const [dr, dc] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const) {
    const line: Point[] = [point];
    for (const sign of [-1, 1]) {
      for (let i = 1; i < BOARD_SIZE; i++) {
        const next = { row: point.row + dr * i * sign, col: point.col + dc * i * sign };
        if (!validPoint(next) || board[next.row]?.[next.col] !== player) break;
        if (sign === -1) line.unshift(next);
        else line.push(next);
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}
export type GomokuEvent =
  | { type: 'created'; roomId: string }
  | { type: 'joined'; roomId: string; color: Stone; opponentId: string; opponentName: string }
  | { type: 'move'; roomId: string; move: Move }
  | { type: 'error'; message: string };
export type GomokuCommand =
  | { type: 'create' }
  | { type: 'join'; roomId: string }
  | { type: 'move'; roomId: string; opponentId: string; move: Move };
export type ConnectionStatus =
  'connecting' | 'connected' | 'reconnecting' | 'offline' | 'unauthorized' | 'closed';
export interface GomokuPort {
  send(command: GomokuCommand): boolean;
  status(): ConnectionStatus;
  subscribe(
    event: (event: GomokuEvent) => void,
    status: (status: ConnectionStatus) => void,
  ): () => void;
}
export function validRoomId(value: string) {
  return /^[a-z0-9_-]{1,64}$/i.test(value);
}
export interface PublicGameMessage {
  id: string;
  sender: string;
  content: string;
}
export interface GomokuSocialPort {
  subscribe(listener: (message: PublicGameMessage) => void): () => void;
  send(content: string, signal: AbortSignal, clientMessageId?: string): Promise<PublicGameMessage>;
}
