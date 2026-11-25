import { useCallback, useEffect, useRef, useState } from 'react';
import { petCardGrades, type PetCardOpening, type PetCardPlayPort } from '@/domain/pet';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { usePetCardCatalog } from './catalog-context';
import styles from './PetCards.module.css';

const openingTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function PetCardHistory({ port }: { port: PetCardPlayPort }) {
  const catalog = usePetCardCatalog();
  const requestNext = useRef<() => void>(() => {});
  const [items, setItems] = useState<PetCardOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const loadMore = useCallback(() => requestNext.current(), []);

  useEffect(() => {
    const request = new AbortController();
    const entries = new Map<string, PetCardOpening>();
    let cursor: string | null = null;
    let inFlight = false;
    let complete = false;
    async function load() {
      if (inFlight || complete || request.signal.aborted) return;
      inFlight = true;
      setLoading(true);
      setError('');
      try {
        const page = await port.history(cursor, request.signal);
        if (request.signal.aborted) return;
        const size = entries.size;
        for (const entry of page.items) entries.set(entry.id, entry);
        complete = !page.nextCursor || page.nextCursor === cursor || entries.size === size;
        cursor = page.nextCursor;
        setItems([...entries.values()]);
        setHasMore(!complete);
      } catch (cause) {
        if (!request.signal.aborted)
          setError(cause instanceof Error ? cause.message : '无法读取开包记录。');
      } finally {
        inFlight = false;
        if (!request.signal.aborted) setLoading(false);
      }
    }
    requestNext.current = () => void load();
    void Promise.resolve().then(load);
    return () => request.abort();
  }, [port]);

  if (loading && !items.length) return <LoadingIndicator>正在读取开包记录…</LoadingIndicator>;
  if (!loading && !error && !items.length)
    return (
      <div className={styles.body}>
        <p className={styles.emptyFeedback}>暂无开包记录。</p>
      </div>
    );
  return (
    <div className={styles.body}>
      <ul className={styles.history}>
        {items.map((item) => (
          <li key={item.id}>
            <div className={styles.resultHeading}>
              <strong>{item.poolName}</strong>
              <time dateTime={item.openedAt}>{openingTime.format(new Date(item.openedAt))}</time>
            </div>
            <ul className={styles.historyPulls}>
              {item.cards.map((card, index) => {
                const grade = card.grade ?? catalog.cards[card.cardId]?.grade;
                return (
                  <li key={index}>
                    <span>
                      {card.name}
                      {card.duplicate && '（重复）'}
                    </span>
                    <span className={styles.historyGrade} data-card-grade={grade}>
                      {grade ? petCardGrades[grade].name : '品质未知'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <InfiniteScroll
        label="开包记录"
        hasMore={hasMore}
        loading={loading}
        error={error}
        onLoadMore={loadMore}
      />
    </div>
  );
}
