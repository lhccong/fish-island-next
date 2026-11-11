import { ArrowLeft, MessageCircle, MoreHorizontal, Phone } from 'lucide-react';
import styles from './HotBoardHeader.module.css';

interface HotBoardHeaderProps {
  title: string;
  onBack: (() => void) | null;
}
export function HotBoardHeader({ title, onBack }: HotBoardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>
        {onBack && (
          <button className={styles.back} type="button" onClick={onBack} aria-label="返回全部热榜">
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
        )}
        <h1>{title}</h1>
      </div>
      {onBack ? (
        <div className={styles.actions} aria-label="会话工具（演示）">
          <button type="button" disabled aria-label="会话（演示）">
            <MessageCircle size={19} aria-hidden="true" />
          </button>
          <button type="button" disabled aria-label="通话（演示）">
            <Phone size={19} aria-hidden="true" />
          </button>
          <button type="button" disabled aria-label="更多（演示）">
            <MoreHorizontal size={21} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <span className={styles.caption}>鱼岛 · 热榜</span>
      )}
    </div>
  );
}
