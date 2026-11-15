import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useState } from 'react';
import type { RankingEntry, RankingPort } from '@/domain/landlords';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Landlords.module.css';
export function Ranking({ port }: { port: RankingPort }) {
  const [sort, setSort] = useState('win_rate');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    entries: RankingEntry[];
    error: string;
  }>({ status: 'loading', entries: [], error: '' });
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: 'loading', entries: [], error: '' });
      void port.load(sort, abort.signal).then(
        (entries) => {
          if (!abort.signal.aborted) setState({ status: 'ready', entries, error: '' });
        },
        (error: unknown) => {
          if (!abort.signal.aborted)
            setState({
              status: 'error',
              entries: [],
              error: error instanceof Error ? error.message : '加载失败，请重试',
            });
        },
      );
    }, 0);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [port, sort, revision]);
  return (
    <>
      <div className={styles.row}>
        <Select
          label="排行排序"
          value={sort}
          onValueChange={setSort}
          options={[
            { value: 'win_rate', label: '胜率' },
            { value: 'total_score', label: '总积分' },
            { value: 'total_games', label: '对局数' },
            { value: 'win_games', label: '胜场' },
            { value: 'extra:landlord_win_rate', label: '地主胜率' },
            { value: 'extra:farmer_win_rate', label: '农民胜率' },
            { value: 'extra:rocket_count', label: '王炸次数' },
            { value: 'extra:spring_count', label: '春天次数' },
          ]}
        />
        <Button
          variant="secondary"
          disabled={state.status === 'loading'}
          onClick={() => setRevision((v) => v + 1)}
        >
          刷新排行
        </Button>
      </div>
      <p className={styles.muted}>至少完成 5 局 · 前 50 名</p>
      <ScrollArea label="斗地主排行榜" gutter="reserved" className={styles.ranking ?? ''}>
        {state.status === 'loading' ? (
          <LoadingIndicator>正在加载排行…</LoadingIndicator>
        ) : state.status === 'error' ? (
          <div role="alert">
            <p>{state.error}</p>
            <Button onClick={() => setRevision((v) => v + 1)}>重试排行</Button>
          </div>
        ) : state.entries.length ? (
          state.entries.map((p) => (
            <article key={p.id} className={styles.rankRow}>
              <strong>
                {p.rank} · {p.name}
              </strong>
              <span>
                {p.games} 局 · 胜率 {p.rate}% · {p.score} 分
              </span>
            </article>
          ))
        ) : (
          <p>暂无符合条件的战绩，完成对局后再来看看。</p>
        )}
      </ScrollArea>
    </>
  );
}
