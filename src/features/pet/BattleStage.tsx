import type { BattlePreview, BattleRound } from '@/domain/pet';
import { PetSprite } from './PetSprite';
import styles from './Panels.module.css';

export function BattleStage({
  preview,
  current,
}: {
  preview: BattlePreview;
  current: BattleRound | undefined;
}) {
  return (
    <div className={styles.battleStage} aria-label="挑战演出">
      <div className={styles.fighter} data-active={current?.attacker === 'self'}>
        <strong>{preview.self.name}</strong>
        <PetSprite
          url={preview.self.url}
          name={preview.self.name}
          size={100}
          action={current?.attacker === 'self' ? 'run' : 'idle'}
        />
        <span>生命 {current?.selfHealth ?? (preview.self.health || '结算后显示')}</span>
      </div>
      <span className={styles.versus}>切磋</span>
      <div className={styles.fighter} data-active={current?.attacker === 'opponent'}>
        <strong>{preview.opponent.name}</strong>
        <PetSprite
          url={preview.opponent.url}
          name={preview.opponent.name}
          size={100}
          action={current?.attacker === 'opponent' ? 'run-left' : 'idle'}
        />
        <span>生命 {current?.opponentHealth ?? preview.opponent.health}</span>
      </div>
      {current && (
        <span className={styles.damage} role="status">
          {current.dodge ? '闪避' : `${current.critical ? '暴击 ' : ''}−${current.damage}`}
        </span>
      )}
    </div>
  );
}
