import type { Position } from '@/domain/stock';
import { Button } from '@/shared/ui/Button';
import type { Resource } from './use-resource';
import { format } from './format';
import styles from './StockWorkspace.module.css';
export function StockPositions({
  state,
  onRetry,
  onBuy,
  onSell,
  onDetail,
  canBuy,
}: {
  state: Resource<Position[]>;
  onRetry: () => void;
  onBuy: (code: string) => void;
  onSell: (code: string) => void;
  onDetail: (code: string) => void;
  canBuy: boolean;
}) {
  const positions =
    state.status === 'ready' ? state.data.filter((p) => p.shares > 0 || p.frozen > 0) : [];
  return (
    <section className={styles.listPanel} aria-label="我的持仓">
      <h2>我的持仓</h2>
      {state.status === 'loading' ? (
        <p role="status">正在加载持仓…</p>
      ) : state.status === 'error' ? (
        <div role="alert">
          <p>{state.message}</p>
          <Button onClick={onRetry}>重试持仓</Button>
        </div>
      ) : !positions.length ? (
        <p>暂无持仓，从市场行情选择指数买入。</p>
      ) : (
        <ul className={styles.positions}>
          {positions.map((p) => (
            <li key={p.code}>
              <div>
                <h3>{p.name}</h3>
                <p>
                  市值 {format(p.value)} 积分 · 盈亏 {format(p.profit)}
                </p>
                <p>
                  持有 {format(p.shares)} · 可卖 {format(p.available)} · 锁定 {format(p.locked)} ·
                  冻结 {format(p.frozen)}
                </p>
                <p>成本净值 {format(p.cost)}</p>
              </div>
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => onDetail(p.code)}>
                  查看详情
                </Button>
                <Button variant="secondary" disabled={!canBuy} onClick={() => onBuy(p.code)}>
                  买入
                </Button>
                <Button disabled={p.available <= 0} onClick={() => onSell(p.code)}>
                  卖出
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
