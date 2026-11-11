import { useState, type RefObject } from 'react';
import type { FishCirclePort, MomentAction } from '@/domain/fish-circle';
import { Dialog } from '@/shared/ui/Dialog';
import { useOperation } from './use-operation';
import styles from './Circle.module.css';
const titles: Record<MomentAction, string> = {
  delete: '删除动态',
  top: '置顶动态',
  reward: '打赏动态',
  'lottery/start': '点赞抽奖',
};
export function MomentActionDialog({
  returnFocusRef,
  action,
  id,
  service,
  onDone,
  onClose,
}: {
  returnFocusRef?: RefObject<HTMLElement | null>;
  action: MomentAction;
  id: string;
  service: FishCirclePort;
  onDone: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(action === 'reward' ? 10 : 1);
  const [result, setResult] = useState('');
  const operation = useOperation();
  return (
    <Dialog
      {...(returnFocusRef ? { returnFocusRef } : {})}
      open
      onOpenChange={(open) => {
        if (!open && !operation.pending) onClose();
      }}
      title={titles[action]}
      description={
        action === 'reward'
          ? '将扣除你的积分，请确认打赏数量。'
          : action === 'delete'
            ? '删除后无法恢复，请确认。'
            : '从当前动态的点赞岛友中抽取，结果由服务器发布到评论区。'
      }
      showCloseAction={false}
      dismissLabel="关闭操作"
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void operation
            .run((signal) => service.action(action, id, value, signal))
            .then((message) => {
              if (message) {
                setResult(message);
                onDone();
              }
            });
        }}
      >
        {(action === 'reward' || action === 'lottery/start') && (
          <label>
            {action === 'reward' ? '打赏积分' : '中奖人数'}
            <input
              type="number"
              min={1}
              max={action === 'reward' ? 100000 : 100}
              step={1}
              required
              disabled={operation.pending || !!result}
              value={value}
              onChange={(e) => setValue(e.target.valueAsNumber)}
            />
          </label>
        )}
        {operation.error && <p role="alert">{operation.error}</p>}
        {result && <p role="status">{result}</p>}
        <div className={styles.actions}>
          <button type="button" disabled={operation.pending} onClick={onClose}>
            {result ? '完成' : '取消'}
          </button>
          {!result && (
            <button type="submit" disabled={operation.pending}>
              {operation.pending ? '处理中…' : '确认'}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
