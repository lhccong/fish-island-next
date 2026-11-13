import { useEffect, useRef, useState } from 'react';
import type { RedPacketPort, RedPacketRecord } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './RedPacketMessage.module.css';
import { MemberAvatar } from './MemberAvatar';

type RecordsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; records: readonly RedPacketRecord[] };
export function RedPacketRecords({ id, port }: { id: string; port: RedPacketPort }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RecordsState>({ status: 'loading' });
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const request = new AbortController();
    void port.records(id, request.signal).then(
      (records) => {
        if (!request.signal.aborted) setState({ status: 'ready', records });
      },
      (error: unknown) => {
        if (!request.signal.aborted)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '记录加载失败，请重试',
          });
      },
    );
    return () => request.abort();
  }, [id, open, port, attempt]);
  const amounts = state.status === 'ready' ? state.records.map((record) => record.amount) : [];
  const highest = Math.max(...amounts);
  const lowest = Math.min(...amounts);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) setState({ status: 'loading' });
        setOpen(value);
      }}
      trigger={
        <Button ref={trigger} variant="secondary">
          查看记录
        </Button>
      }
      returnFocusRef={trigger}
      title="红包记录"
      description="按领取积分从高到低排列，手气王和倒霉王按当前记录评定，同分并列；全部同分时不标注"
      hideDescription
      dismissLabel="关闭红包记录"
      showCloseAction={false}
      className={`${styles.dialog}`}
    >
      <ScrollArea label="红包领取记录" gutter="reserved" className={`${styles.records}`}>
        {state.status === 'loading' && <p role="status">记录加载中…</p>}
        {state.status === 'error' && (
          <div role="alert">
            <p>{state.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setState({ status: 'loading' });
                setAttempt((value) => value + 1);
              }}
            >
              重试记录
            </Button>
          </div>
        )}
        {state.status === 'ready' &&
          (state.records.length === 0 ? (
            <p>暂无人抢到红包</p>
          ) : (
            <ul className={styles.recordList}>
              {state.records.map((record) => (
                <li key={record.id} className={styles.record}>
                  <MemberAvatar
                    key={`${record.id}:${record.userAvatar ?? ''}`}
                    member={{ id: record.id, name: record.userName, avatar: record.userAvatar }}
                  />
                  <span className={styles.person}>
                    <span>{record.userName}</span>
                    <span className={styles.time}>
                      {record.grabTime
                        ? new Date(record.grabTime).toLocaleString('zh-CN')
                        : '时间未知'}
                    </span>
                  </span>
                  <span className={styles.recordResult}>
                    <span className={styles.amount}>{record.amount} 积分</span>
                    {highest > lowest && record.amount === highest && (
                      <span className={styles.lucky}>手气王</span>
                    )}
                    {highest > lowest && record.amount === lowest && (
                      <span className={styles.unlucky}>倒霉王</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </ScrollArea>
    </Dialog>
  );
}
