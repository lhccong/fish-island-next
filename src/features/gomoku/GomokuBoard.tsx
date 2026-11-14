import { useRef, useState, type KeyboardEvent } from 'react';
import { coordinate, type Board, type Move, type Point } from '@/domain/gomoku';
import styles from './Gomoku.module.css';

export function GomokuBoard({
  board,
  moves,
  line,
  onMove,
  canMove,
}: {
  board: Board;
  moves: readonly Move[];
  line: readonly Point[];
  onMove: (point: Point) => void;
  canMove: boolean;
}) {
  const [cursor, setCursor] = useState({ row: 7, col: 7 });
  const root = useRef<HTMLDivElement>(null);
  const last = moves.at(-1);
  const keyDown = (event: KeyboardEvent) => {
    const direction = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    const point = {
      row: Math.max(0, Math.min(14, cursor.row + direction[0]!)),
      col: Math.max(0, Math.min(14, cursor.col + direction[1]!)),
    };
    setCursor(point);
    root.current
      ?.querySelector<HTMLButtonElement>(`[data-point="${point.row}-${point.col}"]`)
      ?.focus();
  };
  return (
    <div className={styles.boardFrame}>
      <div
        className={styles.board}
        role="grid"
        aria-label="五子棋棋盘"
        aria-rowcount={15}
        aria-colcount={15}
        ref={root}
        onKeyDown={keyDown}
      >
        <svg className={styles.lines} viewBox="0 0 450 450" aria-hidden="true">
          {Array.from({ length: 15 }, (_, n) => (
            <g key={n}>
              <path d={`M15 ${15 + n * 30}H435 M${15 + n * 30} 15V435`} />
            </g>
          ))}
          {[
            [3, 3],
            [3, 11],
            [7, 7],
            [11, 3],
            [11, 11],
          ].map(([row, col]) => (
            <circle key={`${row}-${col}`} cx={15 + col! * 30} cy={15 + row! * 30} r="3" />
          ))}
        </svg>
        {board.map((row, r) => (
          <div key={r} role="row" className={styles.boardRow}>
            {row.map((stone, c) => {
              const point = { row: r, col: c };
              const chosen = last?.row === r && last.col === c;
              return (
                <div role="gridcell" key={c} aria-selected={chosen} className={styles.cell}>
                  <button
                    type="button"
                    data-point={`${r}-${c}`}
                    data-stone={stone ?? 'empty'}
                    data-last={last?.row === r && last.col === c}
                    data-win={line.some((p) => p.row === r && p.col === c)}
                    className={styles.intersection}
                    tabIndex={cursor.row === r && cursor.col === c ? 0 : -1}
                    aria-label={`${coordinate(point)}，${stone === 'black' ? '黑子' : stone === 'white' ? '白子' : '空位'}`}
                    aria-disabled={!canMove || !!stone}
                    onFocus={() => setCursor(point)}
                    onClick={() => {
                      if (canMove && !stone) {
                        setCursor(point);
                        onMove(point);
                      }
                    }}
                  >
                    <span />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className={styles.boardHelp}>黑棋先行 · 横、竖或斜向连成五子获胜</p>
    </div>
  );
}
