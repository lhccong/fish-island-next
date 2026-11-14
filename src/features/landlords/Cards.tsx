import { cardFace } from '@/domain/landlords';
import styles from './Landlords.module.css';
export function Cards({ cards }: { cards: readonly string[] }) {
  return (
    <div className={styles.cards}>
      {cards.map((id) => {
        const face = cardFace(id);
        return (
          <span key={id} className={styles.smallCard} data-red={face.red}>
            {face.label}
            <small>{face.suit}</small>
          </span>
        );
      })}
    </div>
  );
}
