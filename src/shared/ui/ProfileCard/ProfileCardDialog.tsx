import type { ReactNode, RefObject } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ProfileCardMedia } from './ProfileCardMedia';
import styles from './ProfileCard.module.css';

interface ProfileCardDialogProps {
  title: string;
  name: string;
  cover?: string | null | undefined;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  topAction?: ReactNode;
  footerNotice?: ReactNode;
  footerActions?: ReactNode;
  alternateView?: { content: ReactNode; wide?: boolean } | null;
}

export function ProfileCardDialog({
  title,
  name,
  cover,
  returnFocusRef,
  onClose,
  children,
  topAction,
  footerNotice,
  footerActions,
  alternateView,
}: ProfileCardDialogProps) {
  const featured = !alternateView && !!cover;
  const layout = alternateView
    ? alternateView.wide
      ? styles.wide
      : styles.list
    : featured
      ? styles.featured
      : '';
  return (
    <Dialog
      open
      title={title}
      hideTitle
      description={`${name}的个人资料`}
      hideDescription
      returnFocusRef={returnFocusRef}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={`${styles.dialog} ${layout}`}
      showCloseAction={false}
      dismissLabel={`关闭${title}`}
      dismissClassName={featured ? (styles.coverDismiss ?? '') : ''}
    >
      {topAction}
      <div className={styles.content} hidden={!!alternateView}>
        {cover && (
          <div className={styles.coverPanel}>
            <ProfileCardMedia key={cover} src={cover} name={name} />
          </div>
        )}
        <ScrollArea label={`${title}内容`} gutter="reserved" className={styles.scroll ?? ''}>
          <div className={styles.body}>{children}</div>
        </ScrollArea>
      </div>
      <div className={styles.footer} hidden={!!alternateView}>
        {footerNotice}
        <div className={styles.actions}>
          {footerActions}
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
      {alternateView?.content}
    </Dialog>
  );
}
