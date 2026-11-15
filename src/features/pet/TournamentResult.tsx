import type { PetPort, PetRank } from '@/domain/pet';
import { roundNarration } from './battle-presentation';
import styles from './Tournament.module.css';

export function TournamentResult({
  target,
  result,
}: {
  target: { rank: number; entry?: PetRank };
  result: Awaited<ReturnType<PetPort['compete']>>;
}) {
  return (
    <div className={styles.result}>
      <div role="status">
        <h3>{result.win ? '挑战胜利' : '本次未获胜'}</h3>
        <p>
          第 {target.rank} 席 · {target.entry?.owner || '虚位以待'}
        </p>
        <p>当前名次：{result.rank ?? '尚未上榜'}</p>
      </div>
      {result.rounds.length ? (
        <details>
          <summary>战斗回合记录 · {result.rounds.length} 回合</summary>
          <ol className={styles.rounds}>
            {result.rounds.map((round, i) => (
              <li key={i}>
                第 {i + 1} 回合 · {roundNarration(round, '我的伙伴', target.entry?.name || '对手')}
                <small>
                  我的生命 {round.selfHealth} · 对手生命 {round.opponentHealth}
                </small>
              </li>
            ))}
          </ol>
        </details>
      ) : (
        <p>本次结算未返回战斗回合，以服务端名次为准。</p>
      )}
    </div>
  );
}
