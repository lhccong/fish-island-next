import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useState } from 'react';
import type { DrawPort, DrawIdentity } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';
import styles from './Draw.module.css';
export function RoomComposer({
  service,
  roomId,
  user,
  getSignal,
  canGuess,
  unavailable,
  onSent,
}: {
  service: DrawPort;
  roomId: string;
  user: DrawIdentity;
  getSignal: () => AbortSignal;
  canGuess: boolean;
  unavailable: string;
  onSent: (content: string, guessed: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  async function send() {
    const content = draft.trim();
    if (busy || !content || unavailable) return;
    const signal = getSignal();
    setBusy(true);
    setError('');
    try {
      const result = await service.guess(roomId, content, user, signal);
      if (signal.aborted) return;
      setDraft('');
      setFeedback(result?.correct ? '猜对了！' : result ? '还没猜中，再试试' : '');
      onSent(content, result !== null);
    } catch (e) {
      if (!signal.aborted) setError(e instanceof Error ? e.message : '发送失败，请重试');
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div className={styles.guessInput}>
        <input
          aria-label={canGuess ? '猜一猜画的是什么' : '房间聊天'}
          value={draft}
          maxLength={50}
          disabled={Boolean(unavailable) || busy}
          placeholder={unavailable || (canGuess ? '输入你的猜测' : '输入聊天内容')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault();
          }}
        />
        <Button type="submit" disabled={Boolean(unavailable) || busy || !draft.trim()}>
          {busy ? <LoadingIndicator compact>发送中…</LoadingIndicator> : canGuess ? '猜词' : '发送'}
        </Button>
      </div>
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
