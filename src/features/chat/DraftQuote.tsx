import { memo, useMemo } from 'react';
import { useStore } from 'zustand';
import { X } from 'lucide-react';
import { messagePreview } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import styles from './DraftQuote.module.css';

export const DraftQuote = memo(function DraftQuote({
  id,
  senderName,
  onDismiss,
}: {
  id: string;
  senderName: string;
  onDismiss: () => void;
}) {
  const { controller } = useChatRealtime();
  const message = useStore(controller.store, (state) =>
    Object.values(state.messages).find((message) => message.id === id),
  );
  const preview = useMemo(
    () =>
      !message
        ? '引用消息不在当前窗口中'
        : message.revoked
          ? '引用消息已撤回'
          : messagePreview(message.content),
    [message],
  );
  return (
    <section className={styles.quote} aria-label="引用消息">
      <div className={styles.content}>
        <span className={styles.sender}>引用 {senderName || '岛友'}</span>
        <p>{preview}</p>
      </div>
      <Button
        variant="secondary"
        className={styles.close}
        aria-label="取消引用"
        onClick={onDismiss}
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </section>
  );
});
