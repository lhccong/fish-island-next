import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { usePackSwipe, type MovePack } from './use-pack-swipe';
import styles from './PetCards.module.css';

export function PetPackCarousel({
  name,
  stock,
  move,
  multiple,
}: {
  name: string;
  stock: number;
  move: MovePack | undefined;
  multiple: boolean;
}) {
  const swipe = usePackSwipe(move);
  return (
    <div className={styles.packCarousel} role="group" aria-label="切换卡包">
      {multiple && (
        <Button
          className={styles.packArrow ?? ''}
          variant="secondary"
          aria-label="上一款卡包"
          disabled={!move}
          onClick={() => move?.(-1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
      )}
      <div
        className={styles.packSelection}
        aria-live="polite"
        data-swipe-enabled={!!move}
        {...swipe}
      >
        <strong>{name}</strong>
        <span>待拆 {stock} 包</span>
      </div>
      {multiple && (
        <Button
          className={styles.packArrow ?? ''}
          variant="secondary"
          aria-label="下一款卡包"
          disabled={!move}
          onClick={() => move?.(1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
