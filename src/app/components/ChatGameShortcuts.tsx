import { PawPrint, Sprout } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useGameWindows } from './game-windows-context';
import styles from './ChatGameShortcuts.module.css';

export function ChatGameShortcuts() {
  const open = useGameWindows();
  return (
    <div className={styles.shortcuts} role="group" aria-label="农场与宠物快捷入口">
      <Button
        variant="secondary"
        className={styles.icon}
        aria-label="打开农场悬浮窗"
        title="农场"
        aria-haspopup="dialog"
        onClick={(event) => open('farm', event.currentTarget)}
      >
        <Sprout size={21} aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        className={styles.icon}
        aria-label="打开宠物悬浮窗"
        title="宠物"
        aria-haspopup="dialog"
        onClick={(event) => open('pet', event.currentTarget)}
      >
        <PawPrint size={21} aria-hidden="true" />
      </Button>
    </div>
  );
}
