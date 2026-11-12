import { useState } from 'react';
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
}: {
  label: string;
  description: string;
  action: (signal: AbortSignal) => Promise<void>;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const operation = usePetOperation();
  return (
    <Dialog
      title={label}
      description={description}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="secondary" disabled={disabled}>
          {label}
        </Button>
      }
      showCloseAction={false}
      dismissLabel="关闭确认"
    >
      <ScrollArea label="操作确认内容" gutter="reserved" className={styles.confirmScroll ?? ''}>
        <div className={styles.body}>
          <p>{description}</p>
        </div>
      </ScrollArea>
      <OperationNotice notice={operation.notice} />
      <div className={styles.actions}>
        <Button variant="secondary" disabled={operation.pending} onClick={() => setOpen(false)}>
          取消
        </Button>
        <Button
          disabled={operation.pending}
          onClick={() =>
            void operation.run(action, '操作成功', () => {
              setOpen(false);
              onSuccess();
            })
          }
        >
          {operation.pending ? '处理中…' : '确认'}
        </Button>
      </div>
    </Dialog>
  );
}
