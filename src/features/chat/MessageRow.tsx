import { LoaderCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { messagePreview, parseMessageContent } from '@/domain/chat';
import { memo, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { useChatRealtime } from './realtime-context';
import { MemberAvatar } from './MemberAvatar';
import { MessageContent } from './MessageContent';
import { MessageMenu } from './MessageMenu';
import styles from './MessageStream.module.css';

export const MessageRow = memo(function MessageRow({
  id,
  showAvatars,
}: {
  id: string;
  showAvatars: boolean;
}) {
  const { controller, userId } = useChatRealtime();
  const message = useStore(controller.store, (state) => state.messages[id]);
  const revoke = useStore(controller.store, (state) => state.revokeState[message?.id ?? id]);
  const connected = useStore(controller.store, (state) => state.connection === 'connected');
  const bubbleRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => parseMessageContent(message?.content ?? ''), [message?.content]);
  if (!message) return null;
  const self = message.senderId === userId;
  const menuProps = {
    message,
    self,
    connected,
    status: revoke,
    onRevoke: () => controller.revoke(message.id, userId),
    returnFocusRef: bubbleRef,
  };
  const local = message.delivery === 'sending' || message.delivery === 'failed';
  const bubble = (
    <div
      ref={bubbleRef}
      className={styles.bubble}
      data-revoked={message.revoked}
      data-red-packet-content={!message.revoked && parts.some((part) => part.kind === 'red-packet')}
      tabIndex={0}
      role="group"
      aria-label={`${message.senderName || '岛友'}的消息`}
      aria-haspopup={!message.revoked && !local ? 'menu' : undefined}
    >
      {message.revoked ? (
        '消息已撤回'
      ) : (
        <>
          {message.quote && (
            <blockquote className={styles.quote}>
              引用 {message.quote.senderName}：{messagePreview(message.quote.content)}
            </blockquote>
          )}
          <MessageContent parts={parts} accountId={userId} />
        </>
      )}
    </div>
  );
  return (
    <article
      className={styles.row}
      data-self={self}
      data-message-id={message.id}
      data-show-avatars={showAvatars}
      data-delivery={message.delivery}
    >
      {showAvatars && (
        <span className={styles.senderAvatar} data-message-avatar="true">
          <MemberAvatar
            key={`${message.senderId}:${message.senderAvatar ?? ''}`}
            member={{
              id: message.senderId,
              name: message.senderName,
              avatar: message.senderAvatar ?? null,
            }}
          />
        </span>
      )}
      <div className={styles.messageBody}>
        <div className={styles.meta}>
          <span>{message.senderName}</span>
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {!message.revoked && !local && <MessageMenu {...menuProps} presentation="button" />}
        </div>
        <div className={styles.bubbleLine}>
          {self && message.delivery === 'sending' && (
            <span role="status" aria-label="消息发送中" className={styles.sending}>
              <LoaderCircle size={16} aria-hidden="true" />
            </span>
          )}
          {local ? (
            bubble
          ) : (
            <MessageMenu {...menuProps} presentation="context">
              {bubble}
            </MessageMenu>
          )}
        </div>
        {self && message.delivery === 'failed' && (
          <div className={styles.revoke}>
            <span role="status">{message.sendError || '发送失败'}</span>
            <Button variant="secondary" onClick={() => controller.sender.retry(id)}>
              重试发送
            </Button>
          </div>
        )}
        {self && !message.revoked && revoke && (
          <div className={styles.revoke}>
            <span role="status">
              {revoke === 'pending' ? '等待撤回确认…' : '撤回未确认，请从消息菜单重试'}
            </span>
          </div>
        )}
      </div>
    </article>
  );
});
