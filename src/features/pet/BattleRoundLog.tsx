import type { BattleRound } from '@/domain/pet';
import { roundNarration } from './battle-presentation';
import styles from './PixelBattle.module.css';

export function BattleRoundLog({
  rounds,
  frame = rounds.length - 1,
  selfName,
  opponentName,
  showHealth = false,
}: {
  rounds: BattleRound[];
  frame?: number;
  selfName: string;
  opponentName: string;
  showHealth?: boolean;
}) {
  const count = Math.min(frame + 1, rounds.length);
  if (!count) return null;
  return (
    <details className={styles.disclosure}>
      <summary>战斗回合记录 · {rounds[count - 1]?.roundNumber ?? count} 回合</summary>
      <ol className={styles.log} aria-label="战斗回合记录">
        {rounds.slice(0, count).map((round, index) => (
          <li key={index}>
            第 {round.roundNumber ?? index + 1} 回合 ·{' '}
            {roundNarration(round, selfName, opponentName)}
            {showHealth && (
              <small className={styles.roundHealth}>
                我的生命 {round.selfHealth} · 对手生命 {round.opponentHealth}
              </small>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
