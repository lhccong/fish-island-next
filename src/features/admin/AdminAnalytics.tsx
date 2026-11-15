import { useEffect, useState } from 'react';
import type { AdminPort, AdminStatistics, AdminTrend } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { AdminTrendChart } from './AdminTrendChart';
import chartStyles from './AdminAnalytics.module.css';
import styles from './Admin.module.css';
type Result =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; trend: AdminTrend[] };
export function AdminAnalytics({
  port,
  onUsers,
}: {
  port: AdminPort;
  onUsers: (type: number) => void;
}) {
  const [query, setQuery] = useState({ type: 0, begin: '', end: '' });
  const [revision, setRevision] = useState(0);
  const [begin, setBegin] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [result, setResult] = useState<Result>({ status: 'loading' });
  useEffect(() => {
    const c = new AbortController();
    void Promise.all([
      port.statistics(c.signal),
      port.trend(query.type, query.begin, query.end, c.signal),
    ])
      .then(([summary, trend]) => {
        if (!c.signal.aborted) {
          setStats(summary);
          setResult({ status: 'ready', trend });
        }
      })
      .catch((e: unknown) => {
        if (!c.signal.aborted)
          setResult({
            status: 'error',
            message: e instanceof Error ? e.message : '数据分析加载失败',
          });
      });
    return () => c.abort();
  }, [port, query, revision]);
  const refresh = () => {
    setResult({ status: 'loading' });
    setRevision((n) => n + 1);
  };
  const statFields = [
    ['totalUsers', '全部用户'],
    ['todayNewUsers', '今日新增'],
    ['todayActiveUsers', '今日活跃'],
    ['thisMonthActiveUsers', '本月活跃'],
  ] as const;
  return (
    <div className={styles.workspace}>
      {stats ? (
        <div className={chartStyles.statistics} data-admin-statistics>
          {statFields.map(([key, label], i) => (
            <button type="button" className={chartStyles.stat} key={key} onClick={() => onUsers(i)}>
              <span>{label}</span>
              <strong>
                {stats[key].toLocaleString()}
                <small> 人</small>
              </strong>
            </button>
          ))}
        </div>
      ) : result.status === 'loading' ? (
        <LoadingIndicator>正在读取用户统计…</LoadingIndicator>
      ) : null}
      <section className={chartStyles.trend} data-admin-trend>
        <h2>新增用户走势图</h2>
        <form
          className={chartStyles.controls}
          onSubmit={(e) => {
            e.preventDefault();
            if (!begin || !end || begin > end) {
              setError('请选择有效的起止日期');
              return;
            }
            setError('');
            setResult({ status: 'loading' });
            setQuery({ type: 3, begin, end });
          }}
        >
          <div className={chartStyles.range} role="group" aria-label="搜索时间">
            <span>搜索时间</span>
            <div className={`${styles.field} ${styles.dateRange}`}>
              <input
                aria-label="开始日期"
                type="date"
                value={begin}
                onChange={(e) => setBegin(e.target.value)}
              />
              <span aria-hidden="true">—</span>
              <input
                aria-label="结束日期"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit">查询</Button>
          <div className={chartStyles.cycle} role="group" aria-label="统计周期">
            {['本周', '本月', '今年'].map((label, type) => (
              <Button
                key={label}
                variant="secondary"
                aria-pressed={query.type === type}
                onClick={() => {
                  setError('');
                  setResult({ status: 'loading' });
                  setQuery({ type, begin: '', end: '' });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="secondary" onClick={refresh}>
            刷新
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        {result.status === 'loading' ? (
          <LoadingIndicator>正在加载数据分析…</LoadingIndicator>
        ) : result.status === 'error' ? (
          <div className={styles.empty}>
            <p role="alert">{result.message}</p>
            <Button onClick={refresh}>重试</Button>
          </div>
        ) : !result.trend.length ? (
          <div className={styles.empty}>该时段暂无新增用户数据</div>
        ) : (
          <AdminTrendChart items={result.trend} />
        )}
      </section>
    </div>
  );
}
