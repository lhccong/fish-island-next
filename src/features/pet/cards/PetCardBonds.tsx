import {
  petCardBondAttributeLabels,
  type PetCardBondBonus,
  type PetCardCatalog,
  type PetCardId,
} from '@/domain/pet';
import styles from './PetCards.module.css';

export function PetCardBonds({
  catalog,
  showcased,
  preview,
}: {
  catalog: PetCardCatalog;
  showcased: readonly PetCardId[];
  preview: boolean;
}) {
  const displayed = new Set(showcased);
  const label = preview ? '卡牌羁绊预览' : '卡牌羁绊';
  const { bonds } = catalog;
  if (!bonds.length) return null;

  return (
    <section className={styles.bonus} aria-label={label}>
      <h4>{label}</h4>
      <p className={styles.bondHint}>上架同势力任意 3 张卡激活羁绊，凑齐 6 张叠加加成。</p>
      <div className={styles.bondGrid}>
        {bonds.map(({ id, name, cardIds, three, six }) => {
          const count = cardIds.filter((id) => displayed.has(id)).length;
          return (
            <section key={id} className={styles.bondGroup} aria-label={name}>
              <h5>{name}</h5>
              <BondTier bonuses={three} count={count} target={3} />
              {cardIds.length >= 6 && <BondTier bonuses={six} count={count} target={6} />}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function BondTier({
  bonuses,
  count,
  target,
}: {
  bonuses: readonly PetCardBondBonus[];
  count: number;
  target: 3 | 6;
}) {
  const active = count >= target;
  return (
    <div className={styles.bondTier}>
      <div className={styles.bondProgress} data-active={active || undefined} aria-live="polite">
        <strong>{target} 张</strong>
        <span>
          {Math.min(count, target)}/{target}
          {active && ' · 已激活'}
        </span>
      </div>
      <ul className={styles.cardStats} role="list" aria-label="羁绊加成">
        {bonuses.map(({ attribute, percentagePoints }) => (
          <li key={attribute}>
            {petCardBondAttributeLabels[attribute]} +{percentagePoints}%
          </li>
        ))}
      </ul>
    </div>
  );
}
