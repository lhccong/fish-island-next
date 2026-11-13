import type { Quote } from '@/domain/stock';
import { Button } from '@/shared/ui/Button';
import { ShoppingCart, ArrowUpRight } from 'lucide-react';
import type { Resource } from './use-resource';
import { format } from './format';
import styles from './StockWorkspace.module.css';
export function StockMarket({
  state,
  onRetry,
  onDetail,
  onBuy,
  canBuy,
}: {
  state: Resource<Quote[]>;
  onRetry: () => void;
  onDetail: (code: string) => void;
  onBuy: (code: string) => void;
  canBuy: boolean;
}) {
  return (
    <section aria-label="市场行情" className={styles.market}>
      {state.status === 'loading' ? (
        <p role="status">正在加载市场行情…</p>
      ) : state.status === 'error' ? (
        <div className={styles.feedback} role="alert">
          <p>{state.message}</p>
          <Button onClick={onRetry}>重试行情</Button>
        </div>
      ) : !state.data.length ? (
        <p className={styles.feedback}>暂无市场行情，请稍后刷新。</p>
      ) : (
        <div className={styles.quotes}>
          {state.data.map((q) => (
            <article key={q.code} className={styles.quote}>
              <button
                type="button"
                className={styles.quoteSelect}
                aria-label={`查看 ${q.name} 详情`}
                onClick={() => onDetail(q.code)}
              >
                <span className={styles.quoteHeading}>
                  <strong>{q.name}</strong>
                  <small>{q.code}</small>
                </span>
                <span
                  data-unavailable={q.price === null}
                  className={`${styles.quotePrice} ${q.change !== null && q.change >= 0 ? styles.up : styles.down}`}
                >
                  {q.price === null
                    ? '—'
                    : q.price.toLocaleString('zh-CN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </span>
                {q.price === null ? (
                  <span className={styles.muted}>行情暂不可用，点击查看历史走势</span>
                ) : (
                  <span className={styles.quoteChanges}>
                    {q.changeValue !== null && (
                      <span className={q.changeValue >= 0 ? styles.up : styles.down}>
                        {q.changeValue >= 0 ? '+' : ''}
                        {format(q.changeValue)}
                      </span>
                    )}
                    <span className={q.change !== null && q.change >= 0 ? styles.up : styles.down}>
                      {q.change !== null && q.change >= 0 ? '+' : ''}
                      {format(q.change ?? 0)}%
                    </span>
                  </span>
                )}
              </button>
              <div className={styles.quoteFooter}>
                <span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                  查看走势与买卖点
                </span>
                <Button
                  disabled={!canBuy || q.price === null}
                  onClick={() => onBuy(q.code)}
                  aria-label={`买入 ${q.name}`}
                >
                  <ShoppingCart size={14} aria-hidden="true" />
                  买入
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
