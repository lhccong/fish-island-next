import { coordinate } from '@/domain/gomoku';
import type { ComponentProps } from 'react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { GomokuBoard } from './GomokuBoard';
import { GomokuPlayers } from './GomokuPlayers';
import { RoomToolbar } from './RoomToolbar';
import type { GomokuController } from './controller';
import type { GameState } from './game-state';
import styles from './Gomoku.module.css';

function turnLabel(s: GameState, canMove: boolean) {
  if (s.phase === 'interrupted') {
    if (s.mode === 'spectator') return s.spectatable ? '观战已暂停' : '观战已结束';
    return '对局已暂停';
  }
  if (s.winner === 'draw') return '棋盘已满，本局和棋';
  if (s.winner) {
    const winner = s.winner === 'black' ? '黑棋获胜' : '白棋获胜';
    if (s.mode === 'spectator') return winner;
    if (s.winner === s.color) return `${winner} · 你赢了！`;
    return `${winner} · ${s.mode === 'single' ? '电脑获胜' : '对方获胜'}`;
  }
  if (s.phase === 'waiting') return '等待岛友加入';
  if (s.mode === 'spectator') return s.turn === 'black' ? '轮到黑棋落子' : '轮到白棋落子';
  if (s.thinking) return '电脑正在思考…';
  return canMove ? '轮到你落子' : '等待对方落子';
}

export function GomokuRoom({
  state: s,
  controller,
  onInvite,
  inviteBusy,
  inviteFeedback,
  user,
  profiles,
}: {
  state: GameState;
  controller: GomokuController;
  onInvite: () => void;
  inviteBusy: boolean;
  inviteFeedback: string;
  user: ComponentProps<typeof GomokuPlayers>['user'];
  profiles: ComponentProps<typeof GomokuPlayers>['profiles'];
}) {
  const watching = s.mode === 'spectator';
  const canMove = !watching && s.phase === 'playing' && s.turn === s.color && !s.thinking;
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
        <GomokuPlayers state={s} user={user} profiles={profiles} />
        <div className={styles.turn} role="status">
          {turnLabel(s, canMove)}
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
          readOnly={watching}
        />
        {s.notice && (
          <p role="status" className={styles.feedback}>
            {s.notice}
          </p>
        )}
        {!watching && s.phase === 'finished' && (
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
