import { lazy, Suspense, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import styles from './EmoticonPanel.module.css';

const Panel = lazy(() => import('./EmoticonPanel'));
export function EmoticonLauncher() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title="表情包"
      description="选图加入草稿再发送。电脑悬停放大，右键管理；手机使用图片角上的“…”菜单。"
      open={open}
      onOpenChange={setOpen}
      className={styles.dialog ?? ''}
      returnFocusRef={trigger}
      dismissLabel="关闭表情包"
      showCloseAction={false}
      trigger={
        <Button ref={trigger} variant="secondary" aria-label="表情包">
          <Smile size={20} aria-hidden="true" />
        </Button>
      }
    >
      {open && (
        <Suspense fallback={<p role="status">正在加载表情包面板…</p>}>
          <Panel onSelect={() => setOpen(false)} />
        </Suspense>
      )}
    </Dialog>
  );
}
