import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { useChatRealtime } from './realtime-context';
import styles from './SendRedPacket.module.css';

const Form = lazy(() => import('./SendRedPacketForm'));
export function RedPacketLauncher() {
  const { packetCreation } = useChatRealtime();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title="发送红包"
      description="积分红包发送到当前群聊。"
      hideDescription
      open={open}
      onOpenChange={(next) => {
        if (next) packetCreation.reset();
        setOpen(next);
      }}
      returnFocusRef={trigger}
      className={styles.dialog ?? ''}
      dismissLabel="关闭发送红包"
      showCloseAction={false}
      trigger={
        <Button ref={trigger} variant="secondary" aria-label="发红包" title="发红包">
          <Mail size={20} aria-hidden="true" />
        </Button>
      }
    >
      {open && (
        <Suspense fallback={<LoadingIndicator>正在加载红包表单…</LoadingIndicator>}>
          <Form onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Dialog>
  );
}
