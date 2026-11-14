import { ScanFace } from 'lucide-react';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import styles from './GameCatalog.module.css';
export function UndercoverEntry({
  onPlay,
  onWindow,
}: {
  onPlay: () => void;
  onWindow: () => void;
}) {
  return (
    <div className={styles.entry}>
      <button type="button" className={styles.stockCard} onClick={onPlay} aria-label="打开谁是卧底">
        <div className={styles.stockArt} aria-hidden="true">
          <span>FISH ISLAND UNDERCOVER</span>
          <h3>
            藏好词语，
            <br />
            读懂弦外之音。
          </h3>
          <ScanFace size={100} strokeWidth={1} />
          <p>同屏推理 · 联机房间</p>
        </div>
        <div className={styles.stockCaption}>
          <div>
            <span>秘密发牌 · 轮流描述 · 投票推理</span>
            <h3>谁是卧底</h3>
            <p>每一句线索，都可能露出破绽</p>
          </div>
        </div>
      </button>
      <WindowLauncher
        className={styles.windowLauncher ?? ''}
        label="独立窗口打开谁是卧底"
        onClick={onWindow}
      />
    </div>
  );
}
