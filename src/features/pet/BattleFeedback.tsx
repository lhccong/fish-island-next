import { Shield } from 'lucide-react';
import type { BattleRound } from '@/domain/pet';
import styles from './PixelBattle.module.css';

export function BattleFeedback({
  current,
  attacking,
  frame,
}: {
  current: BattleRound;
  attacking: boolean;
  frame: number;
}) {
  const effect = current.dodge
    ? 'dodge'
    : current.critical
      ? 'critical'
      : current.block
        ? 'block'
        : current.combo
          ? 'combo'
          : 'normal';
  return (
    <>
      {!attacking && (
        <>
          <span key={`hit-${frame}`} className={styles.hit} data-effect={effect} role="status">
            {current.dodge
              ? '闪避'
              : `${current.critical ? '暴击 ' : current.block ? '格挡 ' : current.combo ? '连击 ' : ''}−${current.damage}`}
          </span>
          {current.dodge ? (
            <span key={`dodge-${frame}`} className={styles.dodgeTrail} aria-hidden="true" />
          ) : current.block ? (
            <span key={`block-${frame}`} className={styles.shield} aria-hidden="true">
              <Shield size={76} strokeWidth={3} />
            </span>
          ) : (
            <span
              key={`impact-${frame}`}
              className={styles.impact}
              data-critical={current.critical}
              aria-hidden="true"
            >
              ✦
            </span>
          )}
          {current.combo && !current.dodge && (
            <span key={`combo-${frame}`} className={styles.comboSlash} aria-hidden="true" />
          )}
        </>
      )}
      {attacking && !!current.lifesteal && (
        <>
          <span key={`heal-${frame}`} className={styles.hit} data-effect="heal" role="status">
            吸血 +{current.lifesteal}
          </span>
          <span key={`heal-ring-${frame}`} className={styles.healRing} aria-hidden="true">
            +
          </span>
        </>
      )}
    </>
  );
}
