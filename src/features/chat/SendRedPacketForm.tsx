import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { useChatRealtime } from './realtime-context';
import styles from './SendRedPacket.module.css';

const types = [
  { value: '1', label: '拼手气红包' },
  { value: '2', label: '普通红包' },
  { value: '3', label: '答题红包' },
];
export default function SendRedPacketForm({ onClose }: { onClose: () => void }) {
  const { packetCreation: creation, user } = useChatRealtime();
  const { values, phase, error } = useStore(creation.store);
  const editing = phase === 'editing';
  const quiz = values.type === 3;
  const total = values.totalAmount.trim();
  const displayTotal =
    total === '' ? '0' : /^\d+$/.test(total) ? Number(total).toLocaleString('zh-CN') : '—';
  return (
    <form
      className={styles.form}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement)
          event.preventDefault();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void creation.submit(user);
      }}
    >
      <ScrollArea label="发送红包表单" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          <div className={styles.typeRow}>
            <span>红包类型</span>
            <div className={styles.typeControl}>
              <Select
                label="红包类型"
                value={String(values.type)}
                options={types}
                disabled={!editing}
                onValueChange={(value) => {
                  if (value === '1' || value === '2' || value === '3')
                    creation.setValues({ type: Number(value) as 1 | 2 | 3 });
                }}
              />
            </div>
          </div>
          <div className={styles.numbers}>
            <label className={styles.numberRow}>
              <span>总积分</span>
              <span className={styles.value}>
                <input
                  aria-label="总积分"
                  inputMode="numeric"
                  value={values.totalAmount}
                  disabled={!editing}
                  maxLength={3}
                  onChange={(event) => creation.setValues({ totalAmount: event.target.value })}
                />
                <span>积分</span>
              </span>
            </label>
            <label className={styles.numberRow}>
              <span>红包个数</span>
              <span className={styles.value}>
                <input
                  aria-label="红包个数"
                  inputMode="numeric"
                  value={values.count}
                  disabled={!editing}
                  maxLength={3}
                  onChange={(event) => creation.setValues({ count: event.target.value })}
                />
                <span>个</span>
              </span>
            </label>
          </div>
          <label className={styles.field}>
            <span>{quiz ? '题目' : '祝福语'}</span>
            <textarea
              aria-label={quiz ? '题目' : '祝福语'}
              value={values.name}
              disabled={!editing}
              maxLength={200}
              rows={2}
              onChange={(event) => creation.setValues({ name: event.target.value })}
            />
          </label>
          {quiz && (
            <label className={styles.field}>
              正确答案
              <input
                aria-label="正确答案"
                value={values.answer}
                disabled={!editing}
                maxLength={50}
                autoComplete="off"
                onChange={(event) => creation.setValues({ answer: event.target.value })}
              />
              <span className={styles.hint}>领取时忽略答案首尾空格及英文大小写。</span>
            </label>
          )}
          {values.type !== 1 && <p className={styles.hint}>普通和答题红包按整数积分均分。</p>}
          <p className={styles.hint}>
            总额 1～100 积分，每份平均 1～10 积分。发送资格、可用积分及当日次数会在发送时校验。
          </p>
        </div>
      </ScrollArea>
      <div className={styles.total} aria-label="总积分预览">
        <strong>{displayTotal}</strong>
        <span>积分</span>
      </div>
      <div className={styles.feedback}>
        {error && <p role="alert">{error}</p>}
        {phase === 'creating' && <p role="status">正在创建红包，请稍候…</p>}
        {phase === 'publishing' && <p role="status">红包已创建，正在发布到群聊…</p>}
        {phase === 'success' && <p role="status">红包发送成功</p>}
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          {phase === 'success' ? '完成' : '关闭'}
        </Button>
        {phase === 'success' ? (
          <Button
            key="new"
            onClick={(event) => {
              event.preventDefault();
              creation.reset();
            }}
          >
            再发一个
          </Button>
        ) : phase === 'publish-error' ? (
          <Button
            key="retry"
            onClick={(event) => {
              event.preventDefault();
              creation.retryPublish();
            }}
          >
            重试发布
          </Button>
        ) : (
          <Button key="submit" type="submit" disabled={!editing || !user}>
            {phase === 'creating'
              ? '创建中…'
              : phase === 'publishing'
                ? '发布中…'
                : phase === 'uncertain'
                  ? '等待确认'
                  : '发送红包'}
          </Button>
        )}
      </div>
    </form>
  );
}
