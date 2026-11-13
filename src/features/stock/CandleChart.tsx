import { useEffect, useRef, useState } from 'react';
import { groupMarkers, type Chart } from '@/domain/stock';
import { Slider } from '@/shared/ui/Slider';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { TradeList } from './TradeList';
import { format } from './format';
import {
  expandedCandles,
  layoutMarkers,
  projectTrades,
  priceScale,
  positionMarkers,
  type ChartMarker,
} from './chart-view';
import styles from './StockWorkspace.module.css';
export function CandleChart({ chart }: { chart: Chart }) {
  const [history, setHistory] = useState(0);
  const [active, setActive] = useState<ChartMarker | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const target = plot.current;
    if (!target) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const visible = expandedCandles(chart.candles, history);
  const candleWidth = Math.min(14, (600 / visible.length) * 0.46);
  const [selected, setSelected] = useState('');
  const detail = visible.find((c) => c.date === selected) ?? visible.at(-1);
  const { groups, unmatched } = groupMarkers(chart);
  const points = projectTrades(visible, chart.trades);
  const { high, span, y } = priceScale(visible, points);
  const markers = positionMarkers(layoutMarkers(groups, visible, width), width, y);
  if (!detail) return <p>暂无日 K 行情，请稍后刷新。</p>;
  return (
    <>
      <p className={styles.muted}>
        日 K · 显示 {visible.length}/{chart.candles.length} 根 · 圆点为真实成交价，B 买入 / S
        卖出，点击查看明细
      </p>
      <div className={styles.ohlc} aria-live="polite">
        <strong>{detail.date}</strong>
        <span>开 {format(detail.open)}</span>
        <span>高 {format(detail.high)}</span>
        <span>低 {format(detail.low)}</span>
        <span>收 {format(detail.close)}</span>
      </div>
      <div ref={plot} className={styles.plot}>
        <svg
          className={styles.candles}
          viewBox="0 0 600 300"
          preserveAspectRatio="none"
          role="img"
          aria-label="指数日 K 线，空心为上涨，实心为下跌"
          data-candle-count={visible.length}
          data-start-date={visible[0]?.date}
          data-end-date={visible.at(-1)?.date}
        >
          <title>指数日 K 线</title>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line x1="0" x2="600" y1={30 + i * 80} y2={30 + i * 80} className={styles.grid} />
            </g>
          ))}
          {visible.map((c, i) => {
            const x = ((i + 0.5) * 600) / visible.length;
            const up = c.close >= c.open;
            return (
              <g key={c.date} className={up ? styles.up : styles.down}>
                <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke="currentColor" />
                <rect
                  x={x - candleWidth / 2}
                  y={Math.min(y(c.open), y(c.close))}
                  width={candleWidth}
                  height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}
                  fill={up ? 'var(--color-surface)' : 'currentColor'}
                  stroke="currentColor"
                />
              </g>
            );
          })}
          {markers.map((marker) => (
            <line
              key={`link:${marker.date}:${marker.type}`}
              x1={marker.x * 6}
              y1={marker.pointY}
              x2={marker.labelX * 6}
              y2={marker.labelY + 22}
              className={`${styles.tradeConnector} ${marker.type === 'B' ? styles.up : styles.down}`}
              data-trade-connector={marker.date}
            />
          ))}
          {points.map((point) => (
            <ellipse
              key={point.id}
              cx={point.x * 6}
              cy={y(point.price)}
              rx={1800 / width}
              ry={3}
              className={`${styles.tradeDot} ${point.type === 'B' ? styles.up : styles.down}`}
              data-trade-id={point.id}
              data-trade-date={point.time.slice(0, 10)}
              data-trade-price={point.price}
            />
          ))}
        </svg>
        <button
          type="button"
          className={styles.inspect}
          style={{ top: 0 }}
          aria-label="查看 K 线明细，左右方向键切换交易日"
          onClick={(event) => {
            if (!event.detail) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const index = Math.min(
              visible.length - 1,
              Math.max(
                0,
                Math.floor(((event.clientX - bounds.left) / bounds.width) * visible.length),
              ),
            );
            const candle = visible[index];
            if (candle) setSelected(candle.date);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const index = visible.findIndex((c) => c.date === detail.date);
            const next =
              visible[
                Math.max(
                  0,
                  Math.min(visible.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)),
                )
              ];
            if (next) setSelected(next.date);
          }}
        />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={styles.priceAxis} style={{ top: 12 + i * 80 }}>
            {(high - (span * i) / 3).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
          </span>
        ))}
        {markers.map((g) => (
          <button
            key={`${g.date}:${g.type}`}
            type="button"
            className={`${styles.marker} ${g.type === 'B' ? styles.buyMarker : styles.sellMarker}`}
            style={{
              left: `${g.labelX}%`,
              top: g.labelY,
            }}
            data-marker-anchor-id={g.trades[0]?.id}
            data-marker-trade-count={g.trades.length}
            data-marker-type={g.type}
            aria-label={`${g.date} ${g.type === 'B' ? '买入 B' : '卖出 S'} ${g.trades.length}笔`}
            onClick={() => setActive(g)}
          >
            {g.type}
            {g.trades.length > 1 ? <small>{g.trades.length}</small> : null}
          </button>
        ))}
      </div>
      <div className={styles.dates}>
        <span>{visible[0]?.date}</span>
        <span>{visible.at(-1)?.date}</span>
      </div>
      {chart.candles.length > 20 && (
        <Slider
          label="查看历史 K 线"
          min={0}
          max={chart.candles.length - 20}
          value={Math.min(history, chart.candles.length - 20)}
          valueText={`显示 ${visible.length}/${chart.candles.length} 根`}
          onValueChange={setHistory}
        />
      )}
      {unmatched > 0 && (
        <p role="status">
          {unmatched} 笔成交发生在无日 K 的日期，未移动到其他交易日。请在交易记录查看。
        </p>
      )}
      {chart.truncated && (
        <p role="status">当前范围成交超过 5000 笔，仅展示最近 5000 笔。完整明细请查看交易记录。</p>
      )}
      {!chart.trades.length && (
        <p className={styles.muted}>此范围暂无成交，交易后会显示 B/S 标记。</p>
      )}
      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        title={`${active?.date ?? ''} ${active?.type === 'B' ? '买入 B' : '卖出 S'}`}
        description="实际成交点位 = 成交净值 × 1000；卖出待结算仍属于已成交。"
        dismissLabel="关闭成交详情"
        showCloseAction={false}
        className={styles.dialog ?? ''}
      >
        <ScrollArea label="成交详情" gutter="reserved" className={styles.dialogBody ?? ''}>
          {active && <TradeList trades={active.trades} />}
        </ScrollArea>
      </Dialog>
    </>
  );
}
