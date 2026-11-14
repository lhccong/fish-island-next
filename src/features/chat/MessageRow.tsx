import { useMessageLocationPulse } from './use-message-location-pulse';
import { MessageQuote } from './MessageQuote';
import { RemarkName } from './RemarkName';
import { SenderTitle } from './SenderTitle';
import { RepeatButton } from './RepeatButton';
import { RepetitionParticipants } from './RepetitionParticipants';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { parseMessageContent } from '@/domain/chat';
import { memo, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { useChatRealtime } from './realtime-context';
import { MemberAvatar } from './MemberAvatar';
import { MessageContent } from './MessageContent';
import { MessageMenu } from './MessageMenu';
import styles from './MessageStream.module.css';
import type { ChatPresentation } from './chat-presentation';

export const MessageRow = memo(function MessageRow({
  id,
  showAvatars,
  presentation = 'conversation',
  rowNumber,
}: {
  id: string;
  showAvatars: boolean;
  presentation?: ChatPresentation;
  rowNumber: number | undefined;
}) {
  const { controller, userId, draft, composerRef, navigation } = useChatRealtime();
  const locationRevision = useStore(navigation.store, (state) =>
    state.target === id ? state.revision : 0,
  );
  const message = useStore(controller.store, (state) => state.messages[id]);
  const group = useStore(controller.store, (state) => state.repetitions[id]);
  const revoke = useStore(controller.store, (state) => state.revokeState[message?.id ?? id]);
  const connected = useStore(controller.store, (state) => state.connection === 'connected');
  const bubbleRef = useRef<HTMLDivElement>(null);
  useMessageLocationPulse(bubbleRef, navigation, id, locationRevision);
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
      data-image-only={
        !message.revoked &&
        !message.quote &&
        parts.some((part) => part.kind === 'image') &&
        parts.every((part) => part.kind === 'image' || (part.kind === 'text' && !part.text.trim()))
      }
      tabIndex={0}
      role="group"
      aria-label={`${message.senderName || '岛友'}的消息`}
      aria-haspopup={!message.revoked && !local ? 'menu' : undefined}
    >
      {message.revoked ? (
        '消息已撤回'
      ) : (
        <>
          {message.quote && <MessageQuote quote={message.quote} />}
          <MessageContent parts={parts} accountId={userId} />
        </>
      )}
    </div>
  );
  return (
    <article
      className={styles.row}
      data-self={self}
      data-located={locationRevision > 0}
      data-message-id={message.id}
      data-show-avatars={showAvatars}
      data-delivery={message.delivery}
      data-presentation={presentation}
    >
      {presentation === 'worksheet' && (
        <span className={styles.rowNumber} aria-hidden="true">
          {rowNumber}
        </span>
      )}
      {showAvatars && (
        <button
          type="button"
          className={styles.senderAvatar}
          data-message-avatar="true"
          aria-label={`@${message.senderName}`}
          onClick={() => {
            draft.mention(message.senderName);
            composerRef.current?.focus({ preventScroll: true });
          }}
        >
          <MemberAvatar
            key={`${message.senderId}:${message.senderAvatar ?? ''}`}
            member={{
              id: message.senderId,
              name: message.senderName,
              avatar: message.senderAvatar ?? null,
            }}
          />
        </button>
      )}
      <div className={styles.messageBody}>
        <div className={styles.meta}>
          <div className={styles.identity}>
            <RemarkName id={message.senderId} name={message.senderName} interactive={false} />
            {presentation !== 'worksheet' && (
              <SenderTitle titleId={message.senderTitleId} level={message.senderLevel} />
            )}
          </div>
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </time>
          <span className={styles.messageActions}>
            {!message.revoked && !local && <MessageMenu {...menuProps} presentation="button" />}
          </span>
        </div>
        <div className={styles.bubbleLine} data-repeat={!!group}>
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
          {group && <RepeatButton content={message.content} />}
          {group && group.length >= 3 && (
            <RepetitionParticipants ids={group} showTitles={presentation !== 'worksheet'} />
          )}
        </div>
        <div className={styles.rowFeedback}>
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
      </div>
    </article>
  );
});
