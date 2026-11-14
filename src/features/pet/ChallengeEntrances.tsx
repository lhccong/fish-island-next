import { ArrowUpRight } from 'lucide-react';
import { PixelLandscape } from './PixelLandscape';
import styles from './PixelBattle.module.css';

export function ChallengeEntrances({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (mode: 'boss' | 'tower') => void;
}) {
  return (
    <nav className={styles.hub} aria-label="冒险挑战">
      <button
        type="button"
        className={styles.entrance}
        disabled={disabled}
        onClick={() => onSelect('boss')}
      >
        <PixelLandscape />
        <ArrowUpRight size={20} aria-hidden="true" />
        <strong>宠物 Boss</strong>
        <span>迎战首领 · 争夺伤害贡献</span>
      </button>
      <button
        type="button"
        className={styles.entrance}
        disabled={disabled}
        onClick={() => onSelect('tower')}
      >
        <PixelLandscape tower />
        <ArrowUpRight size={20} aria-hidden="true" />
        <strong>宠物爬塔</strong>
        <span>逐层突破 · 挑战更高纪录</span>
      </button>
    </nav>
  );
}
