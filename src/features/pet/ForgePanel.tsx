import { useCallback, useState } from 'react';
import { forgeSlots, type PetPort } from '@/domain/pet';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { usePetResource, usePetOperation } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import styles from './Panels.module.css';

export function ForgePanel({
  service,
  petId,
  onChange,
}: {
  service: PetPort;
  petId: string;
  onChange: () => void;
}) {
  const [slot, setSlot] = useState('1');
  return (
    <>
      <Select label="锻造部位" value={slot} onValueChange={setSlot} options={forgeSlots} />
      <ForgeSlot
        key={slot}
        slot={Number(slot)}
        service={service}
        petId={petId}
        onChange={onChange}
      />
    </>
  );
}
function ForgeSlot({
  service,
  petId,
  slot,
  onChange,
}: {
  service: PetPort;
  petId: string;
  slot: number;
  onChange: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => service.forge(petId, slot, signal),
    [service, petId, slot],
  );
  const resource = usePetResource(load);
  const operation = usePetOperation();
  const [outcome, setOutcome] = useState('');
  function refresh() {
    resource.reload();
    onChange();
  }
  return (
    <>
      <OperationNotice notice={operation.notice} />
      {outcome && <p role="status">{outcome}</p>}
      <ResourceView state={resource.state} reload={resource.reload}>
        {(data) => (
          <section className={styles.section}>
            <h3 data-tone="amber">锻造台 · 等级 {data.level}</h3>
            <div className={styles.stack}>
              {!data.entries.length && <p>此部位暂无词条。</p>}
              {data.entries.map((entry) => (
                <div className={styles.card} key={entry.number}>
                  <span>
                    {entry.name} +{entry.value}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={operation.pending}
                    onClick={() =>
                      void operation.run(
                        (signal) =>
                          service.forgeAction(
                            'lock',
                            petId,
                            slot,
                            data.entries
                              .filter((e) => (e.number === entry.number ? !e.locked : e.locked))
                              .map((e) => e.number),
                            signal,
                          ),
                        '词条锁定状态已更新',
                        refresh,
                      )
                    }
                  >
                    {entry.locked ? '解锁' : '锁定'}
                  </Button>
                </div>
              ))}
              <p className={styles.muted}>
                升级概率 {data.chance}%；刷新基础消耗 100 积分，每条锁定词条额外消耗 50 积分。
              </p>
              <div className={styles.actions}>
                <ConfirmAction
                  disabled={data.max}
                  label={data.max ? '已达最高等级' : `升级 · ${data.cost} 积分`}
                  description={`消耗 ${data.cost} 积分尝试升级，成功概率 ${data.chance}%，失败也可能消耗积分。`}
                  action={async (signal) => {
                    const success = await service.forgeAction('upgrade', petId, slot, [], signal);
                    setOutcome(success ? '升级成功' : '本次升级未成功');
                  }}
                  onSuccess={refresh}
                />
                <ConfirmAction
                  label="刷新词条"
                  description={`消耗 ${100 + data.entries.filter((e) => e.locked).length * 50} 积分刷新未锁定词条，是否继续？`}
                  action={async (signal) => {
                    await service.forgeAction('refresh', petId, slot, [], signal);
                  }}
                  onSuccess={refresh}
                />
              </div>
            </div>
          </section>
        )}
      </ResourceView>
    </>
  );
}
