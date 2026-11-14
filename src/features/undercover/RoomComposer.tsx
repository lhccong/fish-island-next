import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { RoomMessage, UndercoverRealtimePort } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import styles from './Undercover.module.css';
export function RoomComposer({
  roomId,
  realtime,
  user,
  enabled,
  connected,
  onSubmitted,
}: {
  roomId: string;
  realtime: UndercoverRealtimePort;
  user: AuthUser;
  enabled: boolean;
  connected: boolean;
  onSubmitted: (message: RoomMessage) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  function send() {
    if (!enabled || !connected || !draft.trim()) return;
    const message: RoomMessage = {
      id: crypto.randomUUID(),
      roomId,
      senderId: user.id,
      name: user.name,
      content: draft.trim(),
      time: Date.now(),
      submitted: true,
    };
    if (!realtime.send(message, user.avatarUrl)) {
      setError('发送失败，内容已保留，请等待连接恢复后重试');
      return;
    }
    onSubmitted(message);
    setDraft('');
    setError('');
    setSubmitted(true);
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label className={styles.field}>
        你的发言
        <textarea
          aria-label="房间发言内容"
          rows={3}
          value={draft}
          maxLength={500}
          disabled={!enabled}
          placeholder={enabled ? '描述你的词语，不要直接说出答案' : '加入房间且未出局时可以发言'}
          onChange={(e) => {
            setDraft(e.target.value);
            setSubmitted(false);
          }}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault();
              send();
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {submitted && <p role="status">已提交，服务端不提供送达确认。</p>}
      <div className={styles.actions}>
        <Button type="submit" disabled={!enabled || !connected || !draft.trim()}>
          发送发言
        </Button>
      </div>
    </form>
  );
}
