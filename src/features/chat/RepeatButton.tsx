import { useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import styles from './Repetition.module.css';
export function RepeatButton({ content }: { content: string }) {
  const { controller, user, draft } = useChatRealtime();
  const pending = useStore(controller.store, (state) =>
    Object.values(state.messages).some(
      (message) =>
        message.senderId === user?.id &&
        message.content === content &&
        message.delivery === 'sending',
    ),
  );
  const [animate, setAnimate] = useState(false);
  return (
    <Button
      variant="secondary"
      className={styles.repeat}
      aria-label={pending ? '复读发送中' : '加一复读'}
      disabled={!user || pending || content.length > 5000}
      onClick={() => {
        if (!user) return;
        if (controller.sender.repeat(content, user)) setAnimate(true);
        else draft.notify('复读未提交，请处理待发送消息后重试', 'error');
      }}
    >
      <span className={styles.disc} aria-hidden="true">
        +1
      </span>
      {animate && (
        <span className={styles.burst} aria-hidden="true" onAnimationEnd={() => setAnimate(false)}>
          +1
        </span>
      )}
    </Button>
  );
}
