import { useEffect, useRef } from 'react';
import type { ReceivedMessage } from '@/domain/chat';
import { MemberAvatar } from './MemberAvatar';
import { useChatRealtime } from './realtime-context';
import styles from './MessageStream.module.css';

const DOUBLE_CLICK_MS = 350;

export function MessageAvatar({
  message,
  showFrame,
}: {
  message: ReceivedMessage;
  showFrame: boolean;
}) {
  const { controller, user, draft, composerRef } = useChatRealtime();
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ignoreUntil = useRef(0);
  const cancel = () => {
    clearTimeout(pending.current);
    pending.current = undefined;
  };
  useEffect(() => cancel, [message.senderId, message.senderName]);
  const mention = () => {
    draft.mention(message.senderName);
    composerRef.current?.focus({ preventScroll: true });
  };
  return (
    <button
      type="button"
      className={styles.senderAvatar}
      data-message-avatar="true"
      aria-label={`@${message.senderName}`}
      aria-description="单击提及，双击戳一戳"
      title="单击提及，双击戳一戳"
      onBlur={cancel}
      onPointerCancel={cancel}
      onClick={(event) => {
        if (event.detail === 0) {
          cancel();
          mention();
        } else if (performance.now() >= ignoreUntil.current) {
          if (pending.current !== undefined) {
            cancel();
            ignoreUntil.current = performance.now() + DOUBLE_CLICK_MS;
            if (user && !controller.sender.poke(message.senderId, message.senderName, user))
              draft.notify('戳一戳未提交，请处理待发送消息后重试', 'error');
          } else {
            pending.current = setTimeout(() => {
              pending.current = undefined;
              mention();
            }, DOUBLE_CLICK_MS);
          }
        }
      }}
    >
      <MemberAvatar
        showFrame={showFrame}
        key={`${message.senderId}:${message.senderAvatar ?? ''}`}
        member={{
          id: message.senderId,
          name: message.senderName,
          avatar: message.senderAvatar ?? null,
          avatarFrameUrl: message.senderAvatarFrame,
        }}
      />
    </button>
  );
}
