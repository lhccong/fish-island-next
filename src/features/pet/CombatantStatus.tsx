import type { Challenger } from '@/domain/pet';
import { boundedPercent } from '@/domain/pet';
import styles from './PixelBattle.module.css';
import { BattleEquipment } from './BattleEquipment';

export function CombatantStatus({
  fighter,
  health,
  side,
  showEquipment,
}: {
  fighter: Challenger;
  health: number | undefined;
  side: 'self' | 'opponent';
  showEquipment: boolean;
}) {
  const maximum = fighter.maxHealth || fighter.health;
  const value =
    health ?? (fighter.health > 0 ? fighter.health : maximum ? fighter.health : undefined);
  const percent =
    value !== undefined && maximum > 0 ? boundedPercent((value / maximum) * 100) : null;
  return (
    <section className={styles.healthPanel} data-side={side} aria-label={`${fighter.name}状态`}>
      <div className={styles.identity}>
        <strong>{fighter.name}</strong>
        <span>
          {side === 'self' ? '我方' : '对手'}
          {fighter.level ? ` · Lv.${fighter.level}` : ''}
        </span>
      </div>
      <div className={styles.healthLine}>
        <b>HP</b>
        <div
          className={styles.healthTrack}
          role="progressbar"
          aria-label={`${fighter.name}生命`}
          aria-valuemin={0}
          aria-valuemax={maximum || 100}
          {...(percent !== null ? { 'aria-valuenow': Math.max(0, value!) } : {})}
          aria-valuetext={value === undefined ? '待结算' : String(value)}
          data-low={percent !== null && percent <= 25}
        >
          <span style={{ width: `${percent ?? 0}%` }} />
        </div>
      </div>
      <small>
        {value === undefined ? '生命待结算' : `${value}${maximum > 0 ? ` / ${maximum}` : ''}`}
      </small>
      {showEquipment && <BattleEquipment fighter={fighter} />}
    </section>
  );
}
