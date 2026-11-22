import { Sparkle, Sparkles } from 'lucide-react';
import { petCards, type PetCardId } from '@/domain/pet';
import { PetCardFace } from './PetCardFace';
import styles from './ShinyCardReveal.module.css';

export function ShinyCardReveal({ cards }: { cards: PetCardId[] }) {
  return (
    <div className={styles.reveal} data-testid="shiny-reveal">
      <div className={styles.burst} aria-hidden="true" />
      <div className={styles.rays} aria-hidden="true" />
      <Sparkle className={styles.sparkLeft} size={44} aria-hidden="true" />
      <Sparkle className={styles.sparkRight} size={32} aria-hidden="true" />
      <div className={styles.center}>
        <p className={styles.title} role="status">
          <Sparkles size={20} aria-hidden="true" />
          闪耀卡揭晓
          <span className={styles.srOnly}>{cards.map((id) => petCards[id].name).join('、')}</span>
        </p>
        <div className={styles.cards} aria-hidden="true">
          {cards.map((id) => (
            <div className={styles.card} key={id}>
              <PetCardFace id={id} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
