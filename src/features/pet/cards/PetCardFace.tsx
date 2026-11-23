import { Diamond, Footprints, Sparkle, Sparkles, Swords } from 'lucide-react';
import { getPetCard, petCardGrades, petCardStatEntries, type PetCardId } from '@/domain/pet';
import { petCardArt } from './card-art';
import { usePetCardCatalog } from './catalog-context';
import { describePetCardBattleEffect } from './card-battle-copy';
import styles from './PetCards.module.css';

const battleActions = {
  attack: { label: '攻击', Icon: Swords },
  dodge: { label: '闪避', Icon: Footprints },
};

export function PetCardFace({ id, compact = false }: { id: PetCardId; compact?: boolean }) {
  const card = getPetCard(id, usePetCardCatalog());
  const GradeIcon = card.grade === 'shiny' ? Sparkles : Diamond;
  const action = card.grade === 'common' ? battleActions[card.battle.action] : null;
  const effect = card.battle.kind === 'effect' ? card.battle : null;
  return (
    <div className={styles.cardFace} data-grade={card.grade} data-compact={compact}>
      <div className={styles.cardArt} style={petCardArt(card.art)} aria-hidden="true" />
      <div className={styles.cardHeader}>
        <strong>{card.name}</strong>
        <span className={styles.health} aria-label={`生命 +${card.stats.health}`}>
          <small>HP</small> +{card.stats.health}
        </span>
      </div>
      <div className={styles.artSpace} aria-hidden="true">
        {card.grade === 'shiny' && <Sparkle className={styles.foilStar} size={17} />}
      </div>
      <div className={styles.rarity}>
        <GradeIcon size={11} aria-hidden="true" /> {petCardGrades[card.grade].name}
      </div>
      {!compact && (
        <div className={styles.cardAbilities}>
          {action && (
            <div className={`${styles.cardAbility} ${styles.cardAction}`}>
              <strong>
                <action.Icon size={12} aria-hidden="true" />
                {action.label}
              </strong>
              <span>对战动作</span>
            </div>
          )}
          {effect && (
            <div className={styles.cardAbility}>
              <strong>
                <Sparkle size={12} aria-hidden="true" /> {effect.name}
              </strong>
              <span>{describePetCardBattleEffect(effect)}</span>
            </div>
          )}
          <ul
            className={`${styles.cardStats} ${styles.faceStats}`}
            aria-label={`${card.name}基础属性`}
          >
            {petCardStatEntries(card.stats)
              .filter(({ stat }) => stat !== 'health')
              .map(({ stat, label, value }) => (
                <li key={stat}>
                  <span>{label}</span> <strong>+{value}</strong>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
