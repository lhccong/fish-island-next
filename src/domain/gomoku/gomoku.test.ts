import { describe, expect, it } from 'vitest';
import { chooseMove, emptyBoard, placeStone, winningLine, type Board, type Point } from './index';

describe('gomoku rules', () => {
  it.each([
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ])('finds the complete line in direction %j %j', (dr, dc) => {
    let board = emptyBoard();
    const points: Point[] = Array.from({ length: 6 }, (_, i) => ({
      row: 6 + i * dr,
      col: dc === -1 ? 10 - i : 4 + i * dc,
    }));
    for (const point of points) board = placeStone(board, point, 'black')!;
    expect(winningLine(board, points[2]!, 'black')).toHaveLength(6);
    expect(winningLine(board, points[2]!, 'white')).toEqual([]);
  });
  it('never mutates the source, accepts edge coordinates and rejects occupied, fractional and out-of-range points', () => {
    const original = emptyBoard();
    const board = placeStone(original, { row: 14, col: 14 }, 'black')!;
    expect(original[14]![14]).toBeNull();
    expect(placeStone(board, { row: 14, col: 14 }, 'white')).toBeNull();
    for (const point of [
      { row: -1, col: 0 },
      { row: 15, col: 0 },
      { row: 0, col: 1.5 },
      { row: NaN, col: 0 },
    ])
      expect(placeStone(board, point, 'white')).toBeNull();
  });
  it('AI opens in the center, wins before defending and blocks an immediate five', () => {
    expect(chooseMove(emptyBoard(), 'black')).toEqual({ row: 7, col: 7 });
    let board: Board = emptyBoard();
    for (const col of [0, 1, 2, 3]) board = placeStone(board, { row: 0, col }, 'black')!;
    expect(chooseMove(board, 'white')).toEqual({ row: 0, col: 4 });
    for (const col of [0, 1, 2, 3]) board = placeStone(board, { row: 1, col }, 'white')!;
    expect(chooseMove(board, 'white')).toEqual({ row: 1, col: 4 });
  });
  it('returns no AI move on a full board', () => {
    const board: Board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => 'black' as const),
    );
    expect(chooseMove(board, 'white')).toBeNull();
  });
});
