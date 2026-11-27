import { useState, type RefObject } from 'react';
import { Check } from 'lucide-react';
import type { FishCirclePort, MomentAction } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useOperation } from './use-operation';
import styles from './MomentActionDialog.module.css';

const maxRewardPoints = 20;
const rewardPresets = [5, 10, 15, maxRewardPoints];
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
  const isReward = action === 'reward';
  const hasAmount = isReward || action === 'lottery/start';
  const maxAmount = isReward ? maxRewardPoints : 100;
  const [value, setValue] = useState(isReward ? '10' : '1');
  const [result, setResult] = useState('');
  const operation = useOperation();
  const amount = Number(value);
  const valid = !hasAmount || (Number.isInteger(amount) && amount >= 1 && amount <= maxAmount);
  const locked = operation.pending || !!result;
  const invalid = value !== '' && !valid;
  const error = invalid ? `请输入 1 到 ${maxAmount} 之间的整数。` : operation.error;

  return (
    <Dialog
      {...(returnFocusRef ? { returnFocusRef } : {})}
      open
      onOpenChange={(open) => {
        if (!open && !operation.pending) onClose();
      }}
      title={titles[action]}
      description={
        isReward
          ? '确认后扣除相应积分。'
          : action === 'delete'
            ? '删除后无法恢复，请确认。'
            : '从当前动态的点赞岛友中抽取，结果由服务器发布到评论区。'
      }
      showCloseAction={false}
      dismissLabel="关闭操作"
      className={styles.dialog ?? ''}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || locked) return;
          void operation
            .run((signal) => service.action(action, id, amount, signal))
            .then((message) => {
              if (message) {
                setResult(message);
                onDone();
              }
            });
        }}
      >
        {hasAmount && (
          <ScrollArea
            label={isReward ? '打赏设置' : '抽奖设置'}
            gutter="reserved"
            className={styles.body ?? ''}
          >
            <div className={styles.fields}>
              {isReward && (
                <div className={styles.presets} role="group" aria-label="常用积分">
                  {rewardPresets.map((points) => (
                    <Button
                      key={points}
                      variant="secondary"
                      className={styles.preset}
                      aria-pressed={amount === points}
                      disabled={locked}
                      onClick={() => setValue(String(points))}
                    >
                      <strong>{points}</strong> 积分
                      <Check size={12} aria-hidden="true" className={styles.selectedMark} />
                    </Button>
                  ))}
                </div>
              )}
              <label className={styles.field}>
                {isReward ? '打赏积分' : '中奖人数'}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxAmount}
                  step={1}
                  required
                  aria-invalid={invalid || undefined}
                  disabled={locked}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            </div>
          </ScrollArea>
        )}
        <div className={styles.footer}>
          {error && <p role="alert">{error}</p>}
          {result && <p role="status">{result}</p>}
          <div className={styles.actions}>
            {result ? (
              <Button onClick={onClose}>完成</Button>
            ) : (
              <>
                <Button variant="secondary" disabled={operation.pending} onClick={onClose}>
                  取消
                </Button>
                <Button type="submit" disabled={!valid || operation.pending}>
                  {operation.pending ? (
                    <LoadingIndicator compact>处理中…</LoadingIndicator>
                  ) : isReward ? (
                    '确认打赏'
                  ) : (
                    '确认'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
