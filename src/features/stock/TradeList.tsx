import type { Trade } from '@/domain/stock';
import styles from './StockWorkspace.module.css';
import { format } from './format';
export function TradeList({ trades }: { trades: Trade[] }) {
  return (
    <ul className={styles.trades}>
      {trades.map((t) => (
        <li key={t.id}>
          <div>
            <strong className={t.type === 'B' ? styles.up : styles.down}>
              {t.type} · {t.type === 'B' ? '买入' : '卖出'} {t.name}
            </strong>
            <span>{t.time.replace('T', ' ')}</span>
          </div>
          <div>
            <span>
              {format(t.shares)} 份 · {format(t.amount)} 积分
            </span>
            <span>
              成交点位 {format(t.price)} · {t.status}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
