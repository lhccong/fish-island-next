import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { usePetPages } from './use-pet-pages';
import { useCallback, useState } from 'react';
import type { PetPort, SupplyPrize } from '@/domain/pet';
import { Select } from '@/shared/ui/Select';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import { ItemIcon } from './ItemIcon';
import styles from './Panels.module.css';

export function SupplyPanel({ service, onChange }: { service: PetPort; onChange: () => void }) {
  const load = useCallback((signal: AbortSignal) => service.supplies(signal), [service]);
  const resource = usePetResource(load);
  const [selected, setSelected] = useState('');
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(supplies) => {
        if (!supplies.length)
          return <div className={styles.feedback}>暂无开放的幸运补给活动。</div>;
        const active = selected || supplies[0]!.id;
        return (
          <>
            <Select
              label="补给活动"
              value={active}
              onValueChange={setSelected}
              options={supplies.map((supply) => ({ value: supply.id, label: supply.name }))}
            />
            <SupplyDetail key={active} id={active} service={service} onChange={onChange} />
          </>
        );
      }}
    </ResourceView>
  );
}
function SupplyDetail({
  id,
  service,
  onChange,
}: {
  id: string;
  service: PetPort;
  onChange: () => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.supply(id, signal), [service, id]);
  const resource = usePetResource(load);
  const [prizes, setPrizes] = useState<SupplyPrize[]>([]);
  const [cost, setCost] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  return (
    <>
      <ResourceView state={resource.state} reload={resource.reload}>
        {(supply) => (
          <>
            <p className={styles.muted}>
              每次消耗 {supply.cost} 积分，奖励由服务端随机结算。
              {supply.guarantee > 0 ? `活动保底次数：${supply.guarantee}。` : ''}
            </p>
            <div className={styles.grid}>
              {supply.prizes.map((prize) => (
                <article className={styles.card} key={prize.id}>
                  <div className={styles.itemHeading}>
                    <ItemIcon url={prize.icon} />
                    <strong>{prize.name}</strong>
                  </div>
                  <p>{prize.quality}</p>
                </article>
              ))}
            </div>
            <div className={styles.actions}>
              {[1, 10].map((count) => (
                <ConfirmAction
                  key={count}
                  label={count === 1 ? '领取一次' : '领取十次'}
                  description={`消耗 ${supply.cost * count} 积分随机领取 ${count} 次补给，是否继续？`}
                  action={async (signal) => {
                    const result = await service.draw(id, count, signal);
                    setPrizes(result.prizes);
                    setCost(result.cost);
                  }}
                  onSuccess={() => {
                    setRevision((n) => n + 1);
                    onChange();
                  }}
                />
              ))}
            </div>
          </>
        )}
      </ResourceView>
      {cost !== null && (
        <section className={styles.section}>
          <h3>本次补给 · 消耗 {cost} 积分</h3>
          <div className={styles.grid}>
            {prizes.map((prize, index) => (
              <div className={styles.card} key={`${prize.id}:${index}`}>
                <ItemIcon url={prize.icon} />
                <p>{prize.name}</p>
                {prize.convertedPoints !== null && <p>已折算为 {prize.convertedPoints} 积分</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      <SupplyRecords key={revision} service={service} />
    </>
  );
}
function SupplyRecords({ service }: { service: PetPort }) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => service.drawRecords(page, signal),
    [service],
  );
  const resource = usePetPages(load);
  return (
    <section className={styles.section}>
      <h3 data-tone="violet">领取记录</h3>
      <ResourceView state={resource.state} reload={resource.reload}>
        {(data) => (
          <div className={styles.stack}>
            {!data.records.length && <p className={styles.muted}>暂无领取记录。</p>}
            {data.records.map((prize) => (
              <div className={styles.card} key={prize.id}>
                {prize.name}
                <small> · {prize.time}</small>
              </div>
            ))}
            <InfiniteScroll
              label="领取记录"
              hasMore={resource.hasMore}
              loading={resource.loadingMore}
              error={resource.error}
              onLoadMore={resource.loadMore}
            />
          </div>
        )}
      </ResourceView>
    </section>
  );
}
