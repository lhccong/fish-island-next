import type { Position, Quote } from '@/domain/stock';
import { Button } from '@/shared/ui/Button';
import type { Resource } from './use-resource';
import { format } from './format';
import styles from './StockWorkspace.module.css';
export function StockStats({
  balance,
  positions,
  quotes,
  onRetry,
}: {
  balance: Resource<number>;
  positions: Resource<Position[]>;
  quotes: Resource<Quote[]>;
  onRetry: () => void;
}) {
  const holdings = positions.status === 'ready' ? positions.data.filter((p) => p.shares > 0) : [];
  const value =
    positions.status === 'ready' ? positions.data.reduce((n, p) => n + p.value, 0) : null;
  const profit =
    positions.status === 'ready' ? positions.data.reduce((n, p) => n + p.profit, 0) : null;
  let day: number | null = positions.status === 'ready' && holdings.length === 0 ? 0 : null;
  if (positions.status === 'ready' && quotes.status === 'ready' && holdings.length) {
    const changes = holdings.map((p) => {
      const q = quotes.data.find((q) => q.code === p.code);
      return q?.change != null && q.change > -100 ? p.value - p.value / (1 + q.change / 100) : null;
    });
    if (changes.every((v): v is number => v !== null)) day = changes.reduce((n, v) => n + v, 0);
  }
  const amount = (n: number | null, signed = false) =>
    n === null
      ? '—'
      : `${signed && n >= 0 ? '+' : ''}${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className={styles.stats} aria-label="资产概览">
      <article>
        <span>可用积分</span>
        <strong className={styles.down}>
          {balance.status === 'ready'
            ? amount(balance.data)
            : balance.status === 'loading'
              ? '加载中…'
              : '—'}
          <small>{balance.status === 'ready' ? ' 积分' : ''}</small>
        </strong>
        {balance.status === 'error' && (
          <div role="alert">
            <span>{balance.message}</span>
            <Button variant="secondary" onClick={onRetry}>
              重试积分
            </Button>
          </div>
        )}
      </article>
      <article>
        <span>持仓市值</span>
        <strong>
          {amount(value)}
          <small>{value !== null ? ' 积分' : ''}</small>
        </strong>
      </article>
      <article>
        <span>今日盈亏</span>
        <strong className={day !== null && day < 0 ? styles.down : styles.up}>
          {amount(day, true)}
          <small>{day !== null ? ' 积分' : ''}</small>
        </strong>
        <small>{day === null ? '行情或持仓暂不可用' : '按当前持仓估算'}</small>
      </article>
      <article>
        <span>持仓盈亏</span>
        <strong className={profit !== null && profit < 0 ? styles.down : styles.up}>
          {amount(profit, true)}
          <small>{profit !== null ? ' 积分' : ''}</small>
        </strong>
        <small>
          {profit === null
            ? '持仓暂不可用'
            : `当前持仓市值减去成本 ${format(value !== null ? value - profit : 0)}`}
        </small>
      </article>
    </div>
  );
}
