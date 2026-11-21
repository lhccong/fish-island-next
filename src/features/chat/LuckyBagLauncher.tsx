import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, useRef, useState } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import styles from './SendRedPacket.module.css';

const Form = lazy(() => import('./SendLuckyBagForm'));
export function LuckyBagLauncher() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title="发送福袋"
      description="到期由系统随机开奖"
      hideDescription
      open={open}
      onOpenChange={setOpen}
      returnFocusRef={trigger}
      className={styles.dialog ?? ''}
      dismissLabel="关闭福袋面板"
      showCloseAction={false}
      trigger={
        <Button ref={trigger} variant="secondary" aria-label="发福袋" title="发福袋">
          <Gift size={20} aria-hidden="true" />
        </Button>
      }
    >
      {open && (
        <Suspense fallback={<LoadingIndicator>正在加载福袋表单…</LoadingIndicator>}>
          <Form onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Dialog>
  );
}
