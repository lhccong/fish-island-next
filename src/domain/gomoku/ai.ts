import {
  BOARD_SIZE,
  opposite,
  placeStone,
  winningLine,
  type Board,
  type Point,
  type Stone,
} from './game';

// A bounded local heuristic. It never schedules work or participates in online games.
export function chooseMove(board: Board, player: Stone): Point | null {
  const occupied = board.flat().some(Boolean);
  let best: Point | null = null;
  let score = -Infinity;
  for (let row = 0; row < BOARD_SIZE; row++)
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row]![col]) continue;
      const point = { row, col };
      if (!occupied) return { row: 7, col: 7 };
      let nearby = false;
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) if (board[row + dr]?.[col + dc]) nearby = true;
      if (!nearby) continue;
      const mine = placeStone(board, point, player)!;
      const theirs = placeStone(board, point, opposite(player))!;
      let value = winningLine(mine, point, player).length
        ? 1e9
        : winningLine(theirs, point, opposite(player)).length
          ? 1e8
          : 0;
      for (const color of [player, opposite(player)])
        for (const [dr, dc] of [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
        ] as const) {
          let count = 1;
          let open = 0;
          for (const sign of [-1, 1])
            for (let i = 1; i < 5; i++) {
              const cell = board[row + dr * i * sign]?.[col + dc * i * sign];
              if (cell === color) count++;
              else {
                if (cell === null) open++;
                break;
              }
            }
          value += open * 10 ** count * (color === player ? 1.1 : 1);
        }
      value -= Math.abs(row - 7) + Math.abs(col - 7);
      if (value > score) {
        best = point;
        score = value;
      }
    }
  return best;
}
