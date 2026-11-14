import type { Challenger } from '@/domain/pet';
import { formatPetStat } from './format-stat';
import styles from './PixelBattle.module.css';

export function ChallengerStats({ fighter }: { fighter: Challenger }) {
  return (
    <dl className={styles.stats}>
      <div>
        <dt>生命</dt>
        <dd>{fighter.health}</dd>
      </div>
      <div>
        <dt>攻击</dt>
        <dd>{fighter.attack}</dd>
      </div>
      {(fighter.stats ?? [])
        .filter(([label]) => !['攻击', '生命'].includes(label))
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatPetStat(label, value)}</dd>
          </div>
        ))}
      <div>
        <dt>击败奖励 / 积分</dt>
        <dd>{fighter.reward}</dd>
      </div>
    </dl>
  );
}
