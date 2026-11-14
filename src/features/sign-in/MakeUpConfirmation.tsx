import type { RefObject } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import styles from './SignIn.module.css';

export function MakeUpConfirmation({
  date,
  pending,
  error,
  onClose,
  onConfirm,
  returnFocusRef,
}: {
  date: string | null;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Dialog
      title="确认补签"
      description={`补签 ${date ?? ''} 将消耗 20 积分，签到奖励以服务端结算为准。`}
      open={date !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      showCloseAction={false}
      className={`${styles.confirm}`}
      returnFocusRef={returnFocusRef}
    >
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          取消补签
        </Button>
        <Button disabled={pending} onClick={onConfirm}>
          {pending ? '补签中…' : '确认补签'}
        </Button>
      </div>
    </Dialog>
  );
}
