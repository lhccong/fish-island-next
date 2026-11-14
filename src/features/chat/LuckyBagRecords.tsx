import { useEffect, useState } from 'react';
import type { LuckyBagPort, LuckyBagRecord } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import styles from './LuckyBag.module.css';

export function LuckyBagRecords({ id, port }: { id: string; port: LuckyBagPort }) {
  const [state, setState] = useState<{
    records: readonly LuckyBagRecord[];
    loading: boolean;
    error: string;
  }>({ records: [], loading: true, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    void port.records(id, request.signal).then(
      (records) => {
        if (!request.signal.aborted) setState({ records, loading: false, error: '' });
      },
      (error: unknown) => {
        if (!request.signal.aborted)
          setState({
            records: [],
            loading: false,
            error: error instanceof Error ? error.message : '记录加载失败，请重试',
          });
      },
    );
    return () => request.abort();
  }, [id, port, attempt]);
  return (
    <section aria-label="福袋中奖记录">
      <h3>中奖记录</h3>
      {state.loading ? (
        <p role="status">记录加载中…</p>
      ) : state.error ? (
        <p role="alert">{state.error}</p>
      ) : state.records.length === 0 ? (
        <p>暂无中奖记录，未开奖时请稍后刷新。</p>
      ) : (
        <ul className={styles.list}>
          {state.records.map((record) => (
            <li key={record.id}>
              <span>
                {record.userName}
                <small>
                  {record.winTime ? new Date(record.winTime).toLocaleString('zh-CN') : '时间未知'}
                </small>
              </span>
              <strong>{record.amount} 积分</strong>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        disabled={state.loading}
        onClick={() => {
          setState((current) => ({ ...current, loading: true, error: '' }));
          setAttempt((value) => value + 1);
        }}
      >
        {state.error ? '重试记录' : '刷新记录'}
      </Button>
    </section>
  );
}
