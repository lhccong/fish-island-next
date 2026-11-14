import { coordinate, opposite } from '@/domain/gomoku';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { GomokuBoard } from './GomokuBoard';
import { RoomToolbar } from './RoomToolbar';
import type { GameState, GomokuController } from './controller';
import styles from './Gomoku.module.css';

export function GomokuRoom({
  state: s,
  controller,
  onInvite,
  inviteBusy,
  inviteFeedback,
}: {
  state: GameState;
  controller: GomokuController;
  onInvite: () => void;
  inviteBusy: boolean;
  inviteFeedback: string;
}) {
  const canMove = s.phase === 'playing' && s.turn === s.color && !s.thinking;
  const result =
    s.winner === 'draw'
      ? '棋盘已满，本局和棋'
      : s.winner
        ? `${s.winner === 'black' ? '黑棋' : '白棋'}获胜 · ${s.winner === s.color ? '你赢了！' : s.mode === 'single' ? '电脑获胜' : '对方获胜'}`
        : s.phase === 'waiting'
          ? '等待岛友加入'
          : s.phase === 'interrupted'
            ? '对局已暂停'
            : s.thinking
              ? '电脑正在思考…'
              : canMove
                ? '轮到你落子'
                : '等待对方落子';
  return (
    <>
      <RoomToolbar
        state={s}
        controller={controller}
        onInvite={onInvite}
        inviteBusy={inviteBusy}
        inviteFeedback={inviteFeedback}
      />
      <section className={styles.playArea} aria-label="当前对局">
        <div className={styles.players}>
          <div data-active={s.turn === s.color && s.phase === 'playing'}>
            <span className={styles.stone} data-color={s.color} />
            <span>你 · {s.color === 'black' ? '黑棋' : '白棋'}</span>
          </div>
          <span className={styles.versus}>VS</span>
          <div data-active={s.turn !== s.color && s.phase === 'playing'}>
            <span className={styles.stone} data-color={opposite(s.color)} />
            <span>
              {s.mode === 'single' ? '电脑' : s.opponentName} ·{' '}
              {s.color === 'black' ? '白棋' : '黑棋'}
            </span>
          </div>
        </div>
        <div className={styles.turn} role="status">
          {result}
          <small>
            {s.moves.length
              ? `第 ${s.moves.length} 手 · 最近落子 ${coordinate(s.moves.at(-1)!)}`
              : '尚未落子'}
          </small>
        </div>
        <GomokuBoard
          board={s.board}
          moves={s.moves}
          line={s.line}
          onMove={(point) => controller.move(point)}
          canMove={canMove}
        />
        {s.notice && (
          <p role="status" className={styles.feedback}>
            {s.notice}
          </p>
        )}
        {s.phase === 'finished' && (
          <div className={styles.actions}>
            <Button
              onClick={() =>
                s.mode === 'single' ? controller.single(s.color) : controller.create()
              }
              disabled={s.mode === 'online' && s.connection !== 'connected'}
            >
              {s.mode === 'single' ? '再练一局' : '创建新房间'}
            </Button>
          </div>
        )}
      </section>
      <section className={styles.history}>
        <h3>
          棋谱 <small>{s.moves.length} 手</small>
        </h3>
        <div className={styles.historyScroll}>
          <ScrollArea label="对局棋谱" gutter="reserved">
            {s.moves.length ? (
              <ol>
                {s.moves.map((move, i) => (
                  <li key={`${move.row}-${move.col}`}>
                    <span>
                      {i + 1}. {move.player === 'black' ? '黑' : '白'}
                    </span>
                    <strong>{coordinate(move)}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>落子后，棋谱会记录在这里。</p>
            )}
          </ScrollArea>
        </div>
      </section>
    </>
  );
}
