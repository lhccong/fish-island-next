import { Castle, Ghost, Swords } from 'lucide-react';
import { PixelLandscape } from './PixelLandscape';
import styles from './ChallengeEntrances.module.css';

export function ChallengeEntrances({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (mode: 'boss' | 'tower' | 'tournament') => void;
}) {
  return (
    <nav className={styles.hub} aria-label="冒险挑战">
      <button
        type="button"
        className={styles.entrance}
        disabled={disabled}
        title="宠物 Boss"
        onClick={() => onSelect('boss')}
      >
        <PixelLandscape />
        <Ghost size={34} aria-hidden="true" />
        <strong>宠物 Boss</strong>
      </button>
      <button
        type="button"
        className={styles.entrance}
        disabled={disabled}
        title="宠物爬塔"
        onClick={() => onSelect('tower')}
      >
        <PixelLandscape tower />
        <Castle size={34} aria-hidden="true" />
        <strong>宠物爬塔</strong>
      </button>
      <button
        type="button"
        className={styles.entrance}
        disabled={disabled}
        title="武道大会"
        onClick={() => onSelect('tournament')}
      >
        <PixelLandscape />
        <Swords size={34} aria-hidden="true" />
        <strong>武道大会</strong>
      </button>
    </nav>
  );
}
