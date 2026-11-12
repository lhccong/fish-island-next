import { useCallback, useState } from 'react';
import { equipmentSlots, type Companion, type PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetResource, usePetOperation } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import { ItemIcon } from './ItemIcon';
import styles from './Panels.module.css';

export function ItemsPanel({
  service,
  kind,
  pet,
  onChange,
}: {
  service: PetPort;
  kind: 'bag' | 'shop' | 'catalog';
  pet: Companion;
  onChange: () => void;
}) {
  const [current, setCurrent] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) => service.items(kind, current, signal),
    [service, kind, current],
  );
  const resource = usePetResource(load);
  const operation = usePetOperation();
  const [batchResult, setBatchResult] = useState<number | null>(null);
  function refresh() {
    resource.reload();
    onChange();
  }
  return (
    <>
      <OperationNotice notice={operation.notice} />
      {kind === 'bag' && (
        <div className={styles.actions}>
          <ConfirmAction
            label="批量分解"
            description="分解行囊中所有优良和精良品质装备，所得积分以服务端结算为准，操作无法恢复。确认继续？"
            action={async (signal) => setBatchResult(await service.batchDecompose(signal))}
            onSuccess={refresh}
          />
        </div>
      )}
      {batchResult !== null && (
        <p className={styles.notice} role="status">
          批量分解完成，获得 {batchResult} 积分
        </p>
      )}
      {kind === 'bag' && pet.equipment.length > 0 && (
        <section className={styles.section}>
          <h3>已穿戴</h3>
          <div className={styles.grid}>
            {pet.equipment.map(({ slot, item }) => (
              <div className={styles.card} key={slot}>
                <span>
                  {equipmentSlots[slot] || slot} · {item.name}
                </span>
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
                    <ItemIcon url={item.icon} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        品质 {item.rarity} {kind === 'bag' ? `· 数量 ${item.quantity}` : ''}
                      </small>
                    </div>
                  </div>
                  <p>{item.description || '暂无物品说明'}</p>
                  {item.code && <p className={styles.muted}>物品编号：{item.code}</p>}
                  <dl className={styles.stats}>
                    {item.stats.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className={styles.actions}>
                    {kind === 'bag' && item.slot && (
                      <Button
                        disabled={operation.pending}
                        onClick={() =>
                          void operation.run(
                            (s) => service.itemAction('equip', item.id, s),
                            '已穿戴装备',
                            refresh,
                          )
                        }
                      >
                        穿戴
                      </Button>
                    )}
                    {kind === 'bag' && (
                      <ConfirmAction
                        label="分解"
                        description={`确认分解「${item.name}」？分解后无法恢复，所得积分以服务端结算为准。`}
                        action={(s) => service.itemAction('decompose', item.id, s)}
                        onSuccess={refresh}
                      />
                    )}
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
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                disabled={current === 1}
                onClick={() => setCurrent(current - 1)}
              >
                上一页
              </Button>
              <span>
                第 {current} 页 · 共 {data.total} 件
              </span>
              <Button
                variant="secondary"
                disabled={current * 12 >= data.total}
                onClick={() => setCurrent(current + 1)}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
