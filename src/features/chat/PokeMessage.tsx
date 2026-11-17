import { useRef } from 'react';
import type { ReceivedMessage } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useChatRealtime } from './realtime-context';
import { useMessageLocationPulse } from './use-message-location-pulse';
import styles from './PokeMessage.module.css';

export function PokeMessage({
  message,
  status,
  connected,
  locationRevision,
}: {
  message: ReceivedMessage;
  status: 'pending' | 'error' | undefined;
  connected: boolean;
  locationRevision: number;
}) {
  const { userId, user, controller, navigation } = useChatRealtime();
  const ref = useRef<HTMLDivElement>(null);
  useMessageLocationPulse(ref, navigation, message.id, locationRevision);
  const self = message.senderId === userId;
  const poke = message.poke!;
  const local = message.delivery === 'sending' || message.delivery === 'failed';
  return (
    <div ref={ref} className={styles.notice} data-message-id={message.id} tabIndex={0}>
      <span className={styles.content} data-poke-content="true">
        <span>
          {message.revoked ? (
            '戳一戳已撤回'
          ) : (
            <>
              {self ? '我' : message.senderName}拍了拍「
              {poke.targetId === userId ? '我' : poke.targetName}」{poke.suffix}
            </>
          )}
        </span>
        {message.delivery === 'sending' && <LoadingIndicator compact>发送中…</LoadingIndicator>}
        {message.delivery === 'failed' && (
          <>
            <span role="alert">{message.sendError || '戳一戳发送失败'}</span>
            <Button
              variant="inline"
              className={styles.action}
              onClick={() => controller.sender.retry(`local:${message.clientMessageId}`)}
            >
              重试发送
            </Button>
          </>
        )}
        {!message.revoked && !local && (self || user?.role === 'admin') && (
          <Button
            variant="inline"
            className={styles.action}
            disabled={!connected || status === 'pending'}
            aria-label={status === 'pending' ? '撤回中…' : status === 'error' ? '重试撤回' : '撤回'}
            onClick={() => controller.revoke(message.id, userId, user?.role)}
          >
            {status === 'pending' ? (
              <LoadingIndicator compact>撤回中…</LoadingIndicator>
            ) : status === 'error' ? (
              '重试撤回'
            ) : (
              '撤回'
            )}
          </Button>
        )}
      </span>
    </div>
  );
}
