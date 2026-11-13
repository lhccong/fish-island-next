import { useEffect, useRef, useState } from 'react';
import type { StockPort } from '@/domain/stock';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { format } from './format';
import styles from './StockWorkspace.module.css';
export interface TradeTarget {
  code: string;
  name: string;
  type: 'B' | 'S';
  available: number | null;
  balance: number | null;
}
export function TradeDialog({
  target,
  service,
  onClose,
  onSuccess,
}: {
  target: TradeTarget;
  service: StockPort;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);
  useEffect(() => () => request.current?.abort(), []);
  const buy = target.type === 'B';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pendingRef.current) return;
    const amount = Number(value);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (buy && (!Number.isSafeInteger(amount) || amount < 100)) ||
      (!buy && !/^\d+(\.\d{1,4})?$/.test(value))
    ) {
      setError(buy ? '请输入至少 100 的整数积分' : '请输入正数份额，最多 4 位小数');
      return;
    }
    if (
      (buy && target.balance !== null && amount > target.balance) ||
      (!buy && target.available !== null && amount > target.available)
    ) {
      setError(buy ? '可用积分不足' : '超过可卖份额');
      return;
    }
    pendingRef.current = true;
    setPending(true);
    setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      const message = await service.trade(target.code, target.type, amount, controller.signal);
      if (!controller.signal.aborted) onSuccess(message);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          `${e instanceof Error ? e.message : '交易失败'}。如请求超时，请先刷新交易记录确认结果，勿重复提交。`,
        );
    } finally {
      pendingRef.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={`${buy ? '买入' : '卖出'} ${target.name}`}
      description="使用摸鱼岛积分交易。提交后以服务端确认结果为准。"
      {...(!pending ? { dismissLabel: '关闭交易' } : {})}
      showCloseAction={false}
      className={styles.dialog ?? ''}
    >
      <form onSubmit={(event) => void submit(event)} className={styles.tradeForm}>
        <ScrollArea label="交易表单" gutter="reserved" className={styles.dialogBody ?? ''}>
          <div className={styles.formFields}>
            <p>
              {buy
                ? `可用积分：${target.balance === null ? '暂不可用' : format(target.balance)}`
                : `可卖份额：${target.available === null ? '暂不可用' : format(target.available)}`}
            </p>
            <label htmlFor="stock-trade-value">{buy ? '买入积分' : '卖出份额'}</label>
            <input
              id="stock-trade-value"
              autoComplete="off"
              inputMode={buy ? 'numeric' : 'decimal'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={pending}
              aria-describedby="stock-trade-help"
            />
            <p id="stock-trade-help" className={styles.muted}>
              {buy
                ? '最低买入 100 积分；当日买入份额按服务端规则解锁。'
                : '卖出手续费 0.15%，到账及结算时间以服务端确认消息为准。'}
            </p>
          </div>
        </ScrollArea>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            disabled={pending || (buy ? target.balance === null : target.available === null)}
          >
            {pending ? '正在提交…' : `确认${buy ? '买入' : '卖出'}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
