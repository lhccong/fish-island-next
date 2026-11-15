import { useState, type ReactNode } from 'react';
import { TreePalm } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { MyIslandPanel } from './MyIslandPanel';
import styles from './MyIsland.module.css';
export function MyIslandLauncher({
  children,
  onOpen,
}: {
  children?: ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpen?.();
      }}
      title="我的小岛"
      description={
        children ? '手账保存到本机，鱼小圈来自账号动态。' : '待办、随手记和快捷入口仅保存到本机。'
      }
      hideTitle
      hideDescription
      showCloseAction={false}
      dismissLabel="关闭我的小岛"
      className={styles.dialog ?? ''}
      trigger={
        <button type="button" className={styles.icon} aria-label="打开我的小岛" title="我的小岛">
          <TreePalm size={21} aria-hidden="true" />
        </button>
      }
    >
      {children ?? <MyIslandPanel />}
    </Dialog>
  );
}
