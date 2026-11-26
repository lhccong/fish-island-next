import { useEffect } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { useChatRealtime } from './realtime-context';
import styles from './SendRedPacket.module.css';

export default function SendLuckyBagForm({ onClose }: { onClose: () => void }) {
  const { luckyBagCreation: creation, user } = useChatRealtime();
  const { values, phase, error } = useStore(creation.store);
  useEffect(() => {
    if (phase === 'success') onClose();
  }, [phase, onClose]);
  const editing = phase === 'editing';
  return (
    <form
      className={styles.form}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement)
          event.preventDefault();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void creation.submit(user?.id);
      }}
    >
      <ScrollArea label="发送福袋表单" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          <div className={styles.typeRow}>
            <span>分配方式</span>
            <div className={styles.typeControl}>
              <Select
                label="福袋分配方式"
                value={String(values.type)}
                options={[
                  { value: '1', label: '随机分配' },
                  { value: '2', label: '平均分配' },
                ]}
                disabled={!editing}
                onValueChange={(value) => {
                  if (value === '1' || value === '2')
                    creation.setValues({ type: Number(value) as 1 | 2 });
                }}
              />
            </div>
          </div>
          <label className={styles.numberRow}>
            <span>总积分</span>
            <span className={styles.value}>
              <input
                aria-label="总积分"
                inputMode="numeric"
                maxLength={3}
                disabled={!editing}
                value={values.totalAmount}
                onChange={(event) => creation.setValues({ totalAmount: event.target.value })}
              />
              <span>积分</span>
            </span>
          </label>
          <label className={styles.numberRow}>
            <span>中奖人数</span>
            <span className={styles.value}>
              <input
                aria-label="中奖人数"
                inputMode="numeric"
                maxLength={2}
                disabled={!editing}
                value={values.winnerCount}
                onChange={(event) => creation.setValues({ winnerCount: event.target.value })}
              />
              <span>人</span>
            </span>
          </label>
          <label className={styles.numberRow}>
            <span>持续时间</span>
            <span className={styles.value}>
              <input
                aria-label="持续时间"
                inputMode="numeric"
                maxLength={4}
                disabled={!editing}
                value={values.durationSeconds}
                onChange={(event) => creation.setValues({ durationSeconds: event.target.value })}
              />
              <span>秒</span>
            </span>
          </label>
          <label className={styles.field}>
            <span>福袋名称</span>
            <textarea
              aria-label="福袋名称"
              rows={2}
              maxLength={50}
              disabled={!editing}
              value={values.name}
              onChange={(event) => creation.setValues({ name: event.target.value })}
            />
          </label>
          <p className={styles.hint}>
            总额 1～100 积分，中奖人数 1～20 人，单人最多 50 积分；60～1800
            秒后开奖。发送资格、积分与次数由服务端校验。
          </p>
        </div>
      </ScrollArea>
      <div className={styles.feedback}>
        {error && <p role="alert">{error}</p>}
        {phase === 'creating' && <LoadingIndicator compact>正在发送福袋，请稍候…</LoadingIndicator>}
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
        <Button type="submit" disabled={!editing || !user}>
          {phase === 'creating' ? (
            <LoadingIndicator compact>{'发送中…'}</LoadingIndicator>
          ) : phase === 'uncertain' ? (
            '等待确认'
          ) : (
            '发送福袋'
          )}
        </Button>
      </div>
    </form>
  );
}
