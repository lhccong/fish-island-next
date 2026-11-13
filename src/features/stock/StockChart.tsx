import { useCallback, useState } from 'react';
import { indices, type StockPort } from '@/domain/stock';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { useResource } from './use-resource';
import { CandleChart } from './CandleChart';
import styles from './StockWorkspace.module.css';
export function StockChart({
  service,
  code,
  onCodeChange,
  revision,
}: {
  service: StockPort;
  code: string;
  onCodeChange: (code: string) => void;
  revision: number;
}) {
  const [days, setDays] = useState(60);
  const load = useCallback(
    (signal: AbortSignal) => {
      void revision;
      return service.chart(code, days, signal);
    },
    [service, code, days, revision],
  );
  const { state, refresh } = useResource(load);
  return (
    <section className={styles.detailPanel} aria-label="日K与买卖点">
      <div className={styles.sectionHeading}>
        <h2>日 K 与买卖点</h2>
        <Button variant="secondary" onClick={refresh}>
          刷新 K 线
        </Button>
      </div>
      <div className={styles.filters}>
        <Select label="指数" value={code} options={indices} onValueChange={onCodeChange} />
        <Select
          label="行情范围"
          value={String(days)}
          options={[60, 120, 250].map((n) => ({ value: String(n), label: `近 ${n} 个交易日` }))}
          onValueChange={(value) => setDays(Number(value))}
        />
      </div>
      {state.status === 'loading' ? (
        <p role="status">正在加载日 K 与成交标记…</p>
      ) : state.status === 'error' ? (
        <div role="alert">
          <p>{state.message}</p>
          <Button variant="secondary" onClick={refresh}>
            重试 K 线
          </Button>
        </div>
      ) : (
        <CandleChart key={`${code}:${days}`} chart={state.data} />
      )}
      <p className={styles.muted}>
        行情来源：腾讯财经。仅用于积分游戏；行情可能延迟，实际成交及规则以服务端为准。
      </p>
    </section>
  );
}
