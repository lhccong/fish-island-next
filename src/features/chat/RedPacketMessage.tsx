import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { RedPacketRecords } from './RedPacketRecords';
import { RedPacketTitle } from './RedPacketTitle';
import styles from './RedPacketMessage.module.css';

export function RedPacketMessage({ id }: { id: string }) {
  const { packets } = useChatRealtime();
  const entry = useMemo(() => packets.entry(id), [packets, id]);
  useEffect(() => entry.retain(), [entry]);
  const state = useStore(entry.store);
  const [answer, setAnswer] = useState('');
  const quiz = state.detail?.type === 3;
  const ended = state.detail && (state.detail.status !== 0 || state.detail.remainingCount === 0);
  const status = !state.detail
    ? ''
    : state.detail.status === 2
      ? '已过期'
      : ended
        ? '已抢完'
        : `剩余 ${state.detail.remainingCount} 个`;
  const description =
    state.amount !== null
      ? `恭喜你抢到 ${state.amount} 积分！`
      : state.grabError || (state.loading ? '红包加载中…' : status);
  return (
    <span
      className={styles.card}
      data-red-packet="true"
      data-ended={!!ended || state.amount !== null}
    >
      <span className={styles.cover}>
        <svg
          className={styles.envelope}
          width="42"
          height="50"
          viewBox="0 0 42 50"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="38" height="46" rx="5" fill="var(--color-red-packet-envelope)" />
          <path
            d="M2 13 Q21 34 40 13"
            fill="none"
            stroke="var(--color-red-packet-seal)"
            strokeWidth="1.5"
          />
          <circle cx="21" cy="27" r="8" fill="var(--color-red-packet-seal)" />
          <path d="M17 27h8M21 23v8" stroke="var(--color-red-packet-envelope)" strokeWidth="1.5" />
        </svg>
        <span className={styles.info}>
          <RedPacketTitle
            name={state.detail?.name || '恭喜发财，大吉大利'}
            error={state.grabError}
          />
          <span
            className={styles.description}
            role={
              state.grabError
                ? 'alert'
                : state.loading || state.amount !== null
                  ? 'status'
                  : undefined
            }
            title={description}
          >
            {description}
          </span>
        </span>
      </span>
      <span className={styles.footer}>
        <span className={styles.caption}>{quiz ? '答题红包' : '积分红包'}</span>
        {state.error && (
          <span className={styles.feedback} role="alert">
            {state.error}
            <Button variant="secondary" onClick={() => void entry.load()}>
              重试详情
            </Button>
          </span>
        )}
        {quiz && (
          <label className={styles.answer}>
            答案
            <input
              aria-label="红包答案"
              value={answer}
              maxLength={100}
              disabled={state.grabbing || !!ended || state.amount !== null}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </label>
        )}
        <span className={styles.actions}>
          <Button
            disabled={
              !state.detail || state.loading || state.grabbing || !!ended || state.amount !== null
            }
            onClick={() => {
              void entry.grab(answer).then(() => {
                if (entry.store.getState().amount !== null) setAnswer('');
              });
            }}
          >
            {state.grabbing
              ? '领取中…'
              : state.amount !== null
                ? '已领取'
                : quiz
                  ? '提交答案'
                  : '抢红包'}
          </Button>
          <RedPacketRecords id={id} port={packets.port} />
        </span>
      </span>
    </span>
  );
}
