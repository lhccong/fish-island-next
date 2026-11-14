import { Spade } from 'lucide-react';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import styles from './GameCatalog.module.css';
export function LandlordsEntry({ onPlay, onWindow }: { onPlay: () => void; onWindow: () => void }) {
  return (
    <div className={styles.entry}>
      <button type="button" className={styles.stockCard} onClick={onPlay} aria-label="打开斗地主">
        <div className={styles.stockArt} aria-hidden="true">
          <span>FISH ISLAND LANDLORDS</span>
          <h3>
            三人一桌，
            <br />
            好牌慢打。
          </h3>
          <Spade size={100} strokeWidth={1} />
          <p>经典对局 · 好友切磋</p>
        </div>
        <div className={styles.stockCaption}>
          <div>
            <span>叫分抢地主 · 联机牌桌</span>
            <h3>斗地主</h3>
            <p>邀两位岛友，来一场有来有往的牌局</p>
          </div>
        </div>
      </button>
      <WindowLauncher
        className={styles.windowLauncher ?? ''}
        label="独立窗口打开斗地主"
        onClick={onWindow}
      />
    </div>
  );
}
