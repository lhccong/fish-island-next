import { useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { ReminderActions } from './reminder-actions';
import { useOperation } from './use-operation';
import styles from './ReminderDetail.module.css';

export function ScriptReminderAction({
  id,
  release,
}: {
  id: string;
  release: ReminderActions['releaseScriptMark'];
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [released, setReleased] = useState(false);
  const { run, pending, error } = useOperation();
  return (
    <>
      <div className={styles.actions}>
        <Button
          ref={trigger}
          variant="secondary"
          aria-disabled={pending || released}
          onClick={() => {
            if (!pending && !released) setConfirming(true);
          }}
        >
          {pending ? (
            <LoadingIndicator compact>正在解除…</LoadingIndicator>
          ) : released ? (
            '已解除脚本标记'
          ) : (
            '解除误封'
          )}
        </Button>
      </div>
      {released && (
        <span className={styles.screenReaderOnly} role="status">
          已解除脚本标记
        </span>
      )}
      {error && <p role="alert">{error}</p>}
      {confirming && (
        <ConfirmDialog
          title="解除误封"
          description={`确认解除用户 ${id} 的脚本标记？`}
          confirmLabel="确认解除"
          errorMessage="暂时无法解除脚本标记，请重试。"
          returnFocusRef={trigger}
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            void run(async (signal) => {
              await release(id, signal);
              return true;
            }).then((done) => {
              if (done) setReleased(true);
            });
          }}
        />
      )}
    </>
  );
}
