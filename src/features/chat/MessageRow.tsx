import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { CircleAlert } from 'lucide-react';
import { useMessageLocationPulse } from './use-message-location-pulse';
import { MessageQuote } from './MessageQuote';
import { PokeMessage } from './PokeMessage';
import { RemarkName } from './RemarkName';
import { SenderTitle } from './SenderTitle';
import { RepeatButton } from './RepeatButton';
import { RepetitionParticipants } from './RepetitionParticipants';
import { Button } from '@/shared/ui/Button';
import { parseMessageContent, parseMusicMessage } from '@/domain/chat';
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
  showAvatarFrames,
  presentation = 'conversation',
  rowNumber,
  compactWorksheet = false,
}: {
  id: string;
  showAvatars: boolean;
  showAvatarFrames: boolean;
  presentation?: ChatPresentation;
  rowNumber: number | undefined;
  compactWorksheet?: boolean;
}) {
  const { controller, userId, user, draft, composerRef, navigation } = useChatRealtime();
  const locationRevision = useStore(navigation.store, (state) =>
    state.target === id ? state.revision : 0,
  );
  const message = useStore(controller.store, (state) => state.messages[id]);
  const group = useStore(controller.store, (state) => state.repetitions[id]);
  const revoke = useStore(controller.store, (state) => state.revokeState[message?.id ?? id]);
  const connected = useStore(controller.store, (state) => state.connection === 'connected');
  const bubbleRef = useRef<HTMLDivElement>(null);
  useMessageLocationPulse(bubbleRef, navigation, id, locationRevision);
  const parts = useMemo(
    () => (message?.poke ? [] : parseMessageContent(message?.content ?? '')),
    [message?.content, message?.poke],
  );
  const musicOnly = useMemo(
    () => Boolean(parseMusicMessage(message?.content ?? '')),
    [message?.content],
  );
  if (!message) return null;
  const self = message.senderId === userId;
  if (message.poke)
    return (
      <PokeMessage
        message={message}
        status={revoke}
        connected={connected}
        locationRevision={locationRevision}
      />
    );
  const menuProps = {
    message,
    self,
    connected,
    status: revoke,
    onRevoke: () => controller.revoke(message.id, userId, user?.role),
    returnFocusRef: bubbleRef,
  };
  const local = message.delivery === 'sending' || message.delivery === 'failed';
  const bubble = (
    <div
      ref={bubbleRef}
      className={styles.bubble}
      data-revoked={message.revoked}
      data-music-only={!message.revoked && !message.quote && musicOnly}
      data-red-packet-content={
        !message.revoked &&
        parts.some((part) => part.kind === 'red-packet' || part.kind === 'lucky-bag')
      }
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
          <MessageContent parts={parts} accountId={userId} compactImages={compactWorksheet} />
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
            showFrame={showAvatarFrames}
            key={`${message.senderId}:${message.senderAvatar ?? ''}`}
            member={{
              id: message.senderId,
              name: message.senderName,
              avatar: message.senderAvatar ?? null,
              avatarFrameUrl: message.senderAvatarFrame,
            }}
          />
        </button>
      )}
      <div className={styles.messageBody}>
        <div className={styles.meta}>
          <div className={styles.identity}>
            <RemarkName
              id={message.senderId}
              name={message.senderName}
              level={message.senderLevel}
              titleId={message.senderTitleId}
            />
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
        </div>
        <div className={styles.bubbleLine} data-repeat={!!group}>
          {self && message.delivery === 'failed' && (
            <Button
              variant="secondary"
              className={styles.retry}
              aria-label="重试发送"
              aria-description={message.sendError || '发送失败，点击重试'}
              title={`${message.sendError || '发送失败'}，点击重试`}
              onClick={() => controller.sender.retry(id)}
            >
              <CircleAlert size={20} aria-hidden="true" />
            </Button>
          )}
          {self && message.delivery === 'sending' && (
            <span role="status" aria-label="消息发送中" className={styles.sending}>
              <LoadingIndicator compact>发送中…</LoadingIndicator>
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
            <RepetitionParticipants
              ids={group}
              showTitles={presentation !== 'worksheet'}
              showFrames={showAvatarFrames}
            />
          )}
        </div>
        {!message.revoked && !local && (
          <div className={styles.messageActions}>
            <MessageMenu {...menuProps} presentation="button" />
          </div>
        )}
        <div className={styles.rowFeedback}>
          {!message.revoked && revoke && (
            <div className={styles.revoke}>
              {revoke === 'pending' ? (
                <LoadingIndicator compact>等待撤回确认…</LoadingIndicator>
              ) : (
                <span role="status">撤回未确认，请从消息菜单重试</span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});
