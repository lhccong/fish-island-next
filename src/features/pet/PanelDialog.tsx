import type { ReactNode } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Panels.module.css';

export function PanelDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      showCloseAction={false}
      dismissLabel="关闭面板"
      className={styles.dialog ?? ''}
    >
      <ScrollArea label={`${title}内容`} gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.body}>{children}</div>
      </ScrollArea>
    </Dialog>
  );
}
