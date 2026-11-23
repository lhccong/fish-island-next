import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useState, type ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { usePetOperation } from './resource';
import { OperationNotice } from './Feedback';
import styles from './Panels.module.css';

export function ConfirmAction({
  label,
  description,
  action,
  onSuccess,
  disabled = false,
  children,
}: {
  label: string;
  description: string;
  action: (signal: AbortSignal) => Promise<void>;
  onSuccess: () => void;
  disabled?: boolean;
  children?: (pending: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const operation = usePetOperation();
  return (
    <Dialog
      title={label}
      description={description}
      hideDescription
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && !operation.pending) operation.clearNotice();
        setOpen(nextOpen);
      }}
      trigger={
        <Button variant="secondary" disabled={disabled}>
          {label}
        </Button>
      }
      showCloseAction={false}
      dismissLabel="关闭确认"
      className={styles.confirmation ?? ''}
    >
      <ScrollArea label="操作确认内容" gutter="reserved" className={styles.confirmScroll ?? ''}>
        <p className={styles.confirmText} aria-hidden="true">
          {description}
        </p>
        {children?.(operation.pending)}
      </ScrollArea>
      <OperationNotice notice={operation.notice?.error ? operation.notice : null} />
      <div className={styles.actions}>
        <Button variant="secondary" disabled={operation.pending} onClick={() => setOpen(false)}>
          取消
        </Button>
        <Button
          disabled={operation.pending || disabled}
          onClick={() =>
            void operation.run(action, '操作成功', () => {
              setOpen(false);
              onSuccess();
            })
          }
        >
          {operation.pending ? <LoadingIndicator compact>{'处理中…'}</LoadingIndicator> : '确认'}
        </Button>
      </div>
    </Dialog>
  );
}
