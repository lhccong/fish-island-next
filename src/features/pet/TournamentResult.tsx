import type { BattlePreview, PetPort, PetRank } from '@/domain/pet';
import { BattleRoundLog } from './BattleRoundLog';
import styles from './Tournament.module.css';

export function TournamentResult({
  target,
  result,
  preview,
}: {
  target: { rank: number; entry?: PetRank };
  result: Awaited<ReturnType<PetPort['compete']>>;
  preview: BattlePreview | null;
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
        <BattleRoundLog
          rounds={result.rounds}
          selfName={preview?.self.name ?? '我的伙伴'}
          opponentName={preview?.opponent.name ?? target.entry?.name ?? '对手'}
          showHealth
        />
      ) : (
        <p>本次结算未返回战斗回合，以服务端名次为准。</p>
      )}
    </div>
  );
}
