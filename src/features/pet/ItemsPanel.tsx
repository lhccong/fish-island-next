import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { usePetPages } from './use-pet-pages';
import { useCallback, useState } from 'react';
import { equipmentSlots, type Companion, type PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import { ItemIcon } from './ItemIcon';
import { InventoryGrid } from './InventoryGrid';
import { formatPetStat } from './format-stat';
import styles from './Panels.module.css';

export function ItemsPanel({
  service,
  kind,
  pet,
  onChange,
  onManage,
  revision = 0,
}: {
  service: PetPort;
  kind: 'bag' | 'shop' | 'catalog';
  pet: Companion;
  onChange: () => void;
  onManage?: () => void;
  revision?: number;
}) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => {
      // An explicit inventory mutation invalidates the inline snapshot.
      void revision;
      return service.items(kind, page, signal);
    },
    [service, kind, revision],
  );
  const resource = usePetPages(load);
  const operation = usePetOperation();
  const [decomposeResult, setDecomposeResult] = useState('');
  const equippedIds = new Set(pet.equipment.map(({ item }) => item.id));
  function refresh() {
    resource.reload();
    onChange();
  }
  function equip(id: string) {
    void operation.run((signal) => service.itemAction('equip', id, signal), '已穿戴装备', refresh);
  }
  const pagination = (
    <InfiniteScroll
      label="物品"
      hasMore={resource.hasMore}
      loading={resource.loadingMore}
      error={resource.error}
      onLoadMore={resource.loadMore}
    />
  );
  if (onManage)
    return (
      <>
        <OperationNotice notice={operation.notice} />
        <ResourceView state={resource.state} reload={resource.reload}>
          {(data) => (
            <InventoryGrid
              items={data.records}
              total={data.total}
              pet={pet}
              pending={operation.pending}
              onEquip={equip}
              onManage={onManage}
              pagination={pagination}
            />
          )}
        </ResourceView>
      </>
    );
  return (
    <>
      <OperationNotice notice={operation.notice} />
      {kind === 'bag' && (
        <div className={styles.actions}>
          <ConfirmAction
            label="批量分解"
            description="分解行囊中未穿戴的优良和精良装备。操作无法恢复。"
            action={async (signal) => {
              const points = await service.batchDecompose(signal);
              setDecomposeResult(`批量分解完成，获得 ${points} 积分`);
            }}
            onSuccess={refresh}
          />
        </div>
      )}
      {decomposeResult && (
        <p className={styles.notice} role="status">
          {decomposeResult}
        </p>
      )}
      {kind === 'bag' && pet.equipment.length > 0 && (
        <section className={styles.section}>
          <h3 data-tone="amber">
            已穿戴 <small>{pet.equipment.length} 件装备</small>
          </h3>
          <div className={styles.grid}>
            {pet.equipment.map(({ slot, item }) => (
              <div className={`${styles.card} ${styles.equippedCard}`} key={slot}>
                <div className={styles.itemHeading}>
                  <ItemIcon url={item.icon} name={item.name} level={item.level} />
                  <div>
                    <small>
                      {equipmentSlots[slot] || slot} · 品质 {item.rarity}
                    </small>
                    <strong>{item.name}</strong>
                    <small>强化 +{item.level}</small>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  disabled={operation.pending}
                  onClick={() =>
                    void operation.run(
                      (s) => service.itemAction('unequip', slot, s),
                      '已卸下装备',
                      refresh,
                    )
                  }
                >
                  卸下
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
      <ResourceView state={resource.state} reload={resource.reload}>
        {(data) => (
          <>
            {!data.records.length && (
              <div className={styles.feedback}>
                <h3>{kind === 'bag' ? '行囊还是空的' : '暂无物品'}</h3>
                <p>{kind === 'bag' ? '可以到补给铺查看可购买的物品。' : '稍后刷新再看看。'}</p>
              </div>
            )}
            <div className={styles.grid}>
              {data.records.map((item) => (
                <article className={styles.card} key={item.id}>
                  <div className={styles.itemHeading}>
                    <ItemIcon url={item.icon} name={item.name} level={item.slot ? item.level : 0} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        品质 {item.rarity} · {equipmentSlots[item.slot] || '物品'}
                        {kind === 'bag' ? ` · 数量 ${item.quantity} · 强化 +${item.level}` : ''}
                      </small>
                    </div>
                  </div>
                  <p>{item.description || '暂无物品说明'}</p>
                  {item.code && <p className={styles.muted}>物品编号：{item.code}</p>}
                  <dl className={styles.stats}>
                    {item.stats.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{formatPetStat(label, value)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className={styles.actions}>
                    {kind === 'bag' &&
                      (equippedIds.has(item.id) ? (
                        <span className={styles.equippedLabel}>已穿戴</span>
                      ) : (
                        <>
                          {item.slot && (
                            <Button disabled={operation.pending} onClick={() => equip(item.id)}>
                              穿戴
                            </Button>
                          )}
                          <ConfirmAction
                            label="分解"
                            description={`分解「${item.name}」后无法恢复。`}
                            action={(s) => service.itemAction('decompose', item.id, s)}
                            disabled={operation.pending}
                            onSuccess={() => {
                              setDecomposeResult(`已分解「${item.name}」`);
                              refresh();
                            }}
                          />
                        </>
                      ))}
                    {kind === 'shop' && (
                      <ConfirmAction
                        label={`购买 · ${item.price} 积分`}
                        description={`消耗 ${item.price} 积分购买 1 件「${item.name}」，是否继续？`}
                        action={(s) => service.itemAction('purchase', item.id, s)}
                        onSuccess={refresh}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
            {pagination}
          </>
        )}
      </ResourceView>
    </>
  );
}
