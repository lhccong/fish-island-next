import { Pencil } from 'lucide-react';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import styles from './GameCatalog.module.css';
export function DrawEntry({ onPlay, onWindow }: { onPlay: () => void; onWindow: () => void }) {
  return (
    <div className={styles.entry}>
      <button type="button" className={styles.stockCard} onClick={onPlay} aria-label="打开你画我猜">
        <div className={styles.stockArt} aria-hidden="true">
          <span>FISH ISLAND DRAW</span>
          <h3>
            画出灵感，
            <br />
            猜中快乐。
          </h3>
          <Pencil size={100} strokeWidth={1} />
          <p>好友画室 · 接力绘画</p>
        </div>
        <div className={styles.stockCaption}>
          <div>
            <span>多人联机 · 三种词库</span>
            <h3>你画我猜</h3>
            <p>用几笔天马行空，换一场心照不宣</p>
          </div>
        </div>
      </button>
      <WindowLauncher
        className={styles.windowLauncher ?? ''}
        label="独立窗口打开你画我猜"
        onClick={onWindow}
      />
    </div>
  );
}
