import { useState } from 'react';
import { advanceLocalGame, localWord, type LocalAction, type LocalGame } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LocalSetup } from './LocalSetup';
import { LocalTurn } from './LocalTurn';
import styles from './Undercover.module.css';
export function LocalTable() {
  const [game, setGame] = useState<LocalGame | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!game) return <LocalSetup onStart={setGame} />;
  const dispatch = (action: LocalAction) =>
    setGame((old) => (old ? advanceLocalGame(old, action) : old));
  const finished = game.phase === 'finished';
  const result = finished || game.phase === 'round';
  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <h3>
          第 {game.round} 轮 ·{' '}
          {
            {
              deal: '分发词语',
              describe: '轮流描述',
              vote: '秘密投票',
              round: '本轮结果',
              finished: '身份揭晓',
            }[game.phase]
          }
        </h3>
        <Button variant="secondary" onClick={() => setConfirm(true)}>
          结束本局
        </Button>
      </div>
      {result ? (
        <div className={styles.result}>
          <h2>
            {finished
              ? game.winner === 'civilian'
                ? '平民获胜'
                : '卧底获胜'
              : game.eliminated
                ? `${game.players.find((p) => p.id === game.eliminated)?.name} 出局`
                : '平票，本轮无人出局'}
          </h2>
          {finished && (
            <p>
              平民词：{game.words[0]} · 卧底词：{game.words[1]}
            </p>
          )}
          <ul className={styles.players}>
            {game.players.map((p) => (
              <li key={p.id}>
                <span>
                  {p.name}
                  {!p.alive && ' · 已出局'}
                </span>
                <span>
                  {game.tally[p.id] ?? 0} 票
                  {(finished || p.id === game.eliminated) &&
                    ` · ${p.role === 'civilian' ? '平民' : '卧底'}`}
                  {finished && ` · ${localWord(game, p.id)}`}
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <Button onClick={() => (finished ? setGame(null) : dispatch({ type: 'next' }))}>
              {finished ? '再来一局' : '下一轮'}
            </Button>
          </div>
        </div>
      ) : (
        <LocalTurn
          key={`${game.round}:${game.phase}:${game.turn}`}
          game={game}
          onAction={dispatch}
        />
      )}
      {game.descriptions.length > 0 && (
        <details className={styles.rules}>
          <summary>发言记录（{game.descriptions.length}）</summary>
          <ol className={styles.history}>
            {game.descriptions.map((d) => (
              <li key={d.id}>
                <small>
                  第 {d.round} 轮 · {d.name}
                </small>
                <p>{d.text}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="结束本局？"
        description="当前同屏游戏的词语和进度将被清除。"
        showCloseAction={false}
      >
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            继续游戏
          </Button>
          <Button
            onClick={() => {
              setGame(null);
              setConfirm(false);
            }}
          >
            结束本局
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
