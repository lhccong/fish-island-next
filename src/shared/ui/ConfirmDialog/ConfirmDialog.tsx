import { useState, type RefObject } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  errorMessage,
  layer = 'default',
  returnFocusRef,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  errorMessage: string;
  layer?: 'default' | 'nested';
  returnFocusRef: RefObject<HTMLElement | null>;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Dialog
      open
      layer={layer}
      title={title}
      description={description}
      returnFocusRef={returnFocusRef}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      showCloseAction={false}
      className={styles.dialog ?? ''}
    >
      {failed && (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button
          onClick={() => {
            try {
              onConfirm();
            } catch {
              setFailed(true);
              return;
            }
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
