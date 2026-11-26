import { petCardStatEntries, type BattleShowcaseCard } from '@/domain/pet';
import { describePetCardBattleEffect } from './cards/card-battle-copy';
import styles from './ShowcaseCardDetails.module.css';

export function ShowcaseCardDetails({ entry }: { entry: BattleShowcaseCard }) {
  const { stats, effect } = entry;
  const bonuses = petCardStatEntries(stats);
  return (
    <div className={styles.details}>
      {bonuses.length ? (
        <ul className={styles.bonuses} aria-label="上架属性加成" role="list">
          {bonuses.map(({ stat, label, value }) => (
            <li key={stat}>
              {label} +{value}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>无属性加成</p>
      )}
      {effect ? (
        <p>
          <strong>{effect.name}</strong>
          <br />
          {describePetCardBattleEffect(effect)}
        </p>
      ) : (
        <p className={styles.empty}>无战斗被动</p>
      )}
    </div>
  );
}
