import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { usePetPages } from './use-pet-pages';
import { ResourceView } from './Feedback';
import { ItemIcon } from './ItemIcon';
import styles from './Lottery.module.css';
export function LotteryRecords({ service, id }: { service: PetPort; id: string }) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => service.drawRecords(page, signal, id),
    [service, id],
  );
  const resource = usePetPages(load);
  return (
    <section className={styles.records} aria-label="我的中奖记录">
      <h3>我的中奖记录</h3>
      <ScrollArea label="中奖记录列表" gutter="reserved" className={styles.recordsScroll ?? ''}>
        <ResourceView state={resource.state} reload={resource.reload}>
          {(data) => (
            <div className={styles.recordsBody}>
              {!data.records.length && <p className={styles.empty}>暂无中奖记录</p>}
              {data.records.map((prize) => (
                <article key={prize.id} className={styles.record}>
                  <ItemIcon url={prize.icon} name={prize.name} size="compact" />
                  <div>
                    <span>
                      抽中 <strong>{prize.name}</strong>
                    </span>
                    <small>
                      {prize.quality} · {prize.time}
                    </small>
                  </div>
                </article>
              ))}
              <InfiniteScroll
                label="中奖记录"
                hasMore={resource.hasMore}
                loading={resource.loadingMore}
                error={resource.error}
                onLoadMore={resource.loadMore}
              />
            </div>
          )}
        </ResourceView>
      </ScrollArea>
    </section>
  );
}
