import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useState } from 'react';
import type { DrawPort, DrawIdentity } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';
import styles from './Draw.module.css';
export function GuessComposer({
  service,
  roomId,
  user,
  getSignal,
  disabled,
  onSent,
}: {
  service: DrawPort;
  roomId: string;
  user: DrawIdentity;
  getSignal: () => AbortSignal;
  disabled: boolean;
  onSent: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  async function send() {
    if (busy || !draft.trim() || disabled) return;
    const signal = getSignal();
    setBusy(true);
    setError('');
    try {
      const result = await service.guess(roomId, draft.trim(), user, signal);
      if (signal.aborted) return;
      setDraft('');
      setFeedback(
        result?.correct ? '猜对了！' : result ? '还没猜中，再试试' : '已发送，请留意房间提示',
      );
      onSent();
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
      <label htmlFor={`guess-${roomId}`}>猜一猜画的是什么</label>
      <div className={styles.guessInput}>
        <input
          id={`guess-${roomId}`}
          value={draft}
          maxLength={50}
          disabled={disabled || busy}
          placeholder="输入你的答案"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault();
          }}
        />
        <Button type="submit" disabled={disabled || busy || !draft.trim()}>
          {busy ? <LoadingIndicator compact>{'提交中…'}</LoadingIndicator> : '提交猜词'}
        </Button>
      </div>
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
