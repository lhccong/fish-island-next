import type { ReactNode, RefObject } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useAdminMutation } from './use-admin-mutation';
import styles from './Admin.module.css';
export interface EditorProps {
  onClose: () => void;
  onSaved: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}
export function EditorFrame({
  title,
  children,
  onSubmit,
  onClose,
  onSaved,
  returnFocusRef,
  submitLabel = '保存',
  size = 'default',
}: EditorProps & {
  title: string;
  children: ReactNode;
  onSubmit: (signal: AbortSignal) => Promise<void>;
  submitLabel?: string;
  size?: 'default' | 'report';
}) {
  const mutation = useAdminMutation();
  return (
    <Dialog
      open
      title={title}
      description=""
      hideDescription
      dismissLabel={`关闭${title}`}
      showCloseAction={false}
      className={`${styles.dialog} ${size === 'report' ? styles.reportDialog : ''}`}
      {...(returnFocusRef ? { returnFocusRef } : {})}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void mutation.run(onSubmit, onSaved);
        }}
      >
        <ScrollArea label={`${title}表单`} gutter="reserved" className={styles.body ?? ''}>
          <fieldset disabled={mutation.pending} className={styles.grid}>
            {children}
          </fieldset>
        </ScrollArea>
        <div className={styles.footer}>
          {mutation.error && (
            <p className={styles.feedback} role="alert">
              {mutation.error}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.pending}>
              {mutation.pending ? (
                <LoadingIndicator compact>正在提交…</LoadingIndicator>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
