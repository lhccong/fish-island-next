import { useCallback, useState } from 'react';
import { indices, type StockPort } from '@/domain/stock';
import { Button } from '@/shared/ui/Button';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useResource } from './use-resource';
import { StockChart } from './StockChart';
import { StockHistory } from './StockHistory';
import { TradeDialog, type TradeTarget } from './TradeDialog';
import { StockMarket } from './StockMarket';
import { StockPositions } from './StockPositions';
import { StockStats } from './StockStats';
import { StockTabs, type StockTab } from './StockTabs';
import styles from './StockWorkspace.module.css';
export function StockWorkspace({
  service,
  detailCode,
  onDetail,
  onBack,
}: {
  service: StockPort;
  detailCode: string | null;
  onDetail: (code: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<StockTab>('market');
  const [historyVisited, setHistoryVisited] = useState(false);
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<TradeTarget | null>(null);
  const [notice, setNotice] = useState('');
  const loadQuotes = useCallback((s: AbortSignal) => service.quotes(s), [service]);
  const loadPositions = useCallback((s: AbortSignal) => service.positions(s), [service]);
  const loadBalance = useCallback((s: AbortSignal) => service.balance(s), [service]);
  const quotes = useResource(loadQuotes),
    positions = useResource(loadPositions),
    balance = useResource(loadBalance);
  const refresh = () => {
    quotes.refresh();
    positions.refresh();
    balance.refresh();
    setRevision((n) => n + 1);
  };
  const open = (code: string, type: 'B' | 'S') => {
    const p =
      positions.state.status === 'ready' ? positions.state.data.find((p) => p.code === code) : null;
    setTarget({
      code,
      name: indices.find((i) => i.value === code)?.label ?? code,
      type,
      available: p?.available ?? null,
      balance: balance.state.status === 'ready' ? balance.state.data : null,
    });
  };
  const canBuy = balance.state.status === 'ready';
  const selected =
    positions.state.status === 'ready'
      ? positions.state.data.find((p) => p.code === detailCode)
      : null;
  return (
    <div className={styles.workspace}>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      <div hidden={detailCode !== null}>
        <div className={styles.overviewToolbar}>
          <p>五大指数，积分交易</p>
          <Button variant="secondary" onClick={refresh}>
            <RefreshCw size={14} aria-hidden="true" />
            刷新数据
          </Button>
        </div>
        <StockStats
          balance={balance.state}
          positions={positions.state}
          quotes={quotes.state}
          onRetry={balance.refresh}
        />
        <StockTabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            if (value === 'history') setHistoryVisited(true);
          }}
        />
        <div id="stock-market" role="tabpanel" aria-label="市场行情" hidden={tab !== 'market'}>
          <StockMarket
            state={quotes.state}
            onRetry={quotes.refresh}
            onDetail={onDetail}
            onBuy={(code) => open(code, 'B')}
            canBuy={canBuy}
          />
        </div>
        <div
          id="stock-positions"
          role="tabpanel"
          aria-label="我的持仓"
          hidden={tab !== 'positions'}
        >
          <StockPositions
            state={positions.state}
            onRetry={positions.refresh}
            onDetail={onDetail}
            onBuy={(code) => open(code, 'B')}
            onSell={(code) => open(code, 'S')}
            canBuy={canBuy}
          />
        </div>
        <div id="stock-history" role="tabpanel" aria-label="交易记录" hidden={tab !== 'history'}>
          {historyVisited && <StockHistory key={revision} service={service} />}
        </div>
      </div>
      {detailCode && (
        <div className={styles.detail}>
          <div className={styles.sectionHeading}>
            <div className={styles.detailHeading}>
              <Button variant="secondary" onClick={onBack}>
                <ChevronLeft size={16} aria-hidden="true" />
                返回股市
              </Button>
              <h2>
                {indices.find((i) => i.value === detailCode)?.label ?? detailCode}
                <small>{detailCode}</small>
              </h2>
            </div>
            <div className={styles.actions}>
              <Button
                disabled={!canBuy}
                onClick={() => open(detailCode, 'B')}
                aria-label={`买入 ${indices.find((i) => i.value === detailCode)?.label ?? detailCode}`}
              >
                买入
              </Button>
              <Button
                variant="secondary"
                disabled={!selected || selected.available <= 0}
                onClick={() => open(detailCode, 'S')}
              >
                卖出
              </Button>
            </div>
          </div>
          <StockChart
            service={service}
            code={detailCode}
            onCodeChange={onDetail}
            revision={revision}
          />
        </div>
      )}
      {target && (
        <TradeDialog
          target={target}
          service={service}
          onClose={() => setTarget(null)}
          onSuccess={(message) => {
            setNotice(message);
            setTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
