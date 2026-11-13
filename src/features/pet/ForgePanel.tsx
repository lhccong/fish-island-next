import { useCallback, useState } from 'react';
import { forgeSlots, type PetPort } from '@/domain/pet';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { usePetResource, usePetOperation } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import { formatPetNumber, formatPetStat } from './format-stat';
import forgeStyles from './ForgePanel.module.css';
import styles from './Panels.module.css';

const gradeNames: Readonly<Record<number, string>> = {
  1: '白',
  2: '蓝',
  3: '紫',
  4: '金',
  5: '红',
};

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
      <div className={forgeStyles.selector}>
        <span>选择装备部位</span>
        <Select label="锻造部位" value={slot} onValueChange={setSlot} options={forgeSlots} />
      </div>
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
            <h3 data-tone="amber">
              附加词条 <small>{data.entries.length} 条</small>
            </h3>
            <div className={forgeStyles.content}>
              <dl className={forgeStyles.summary}>
                <div>
                  <dt>强化等级</dt>
                  <dd>Lv.{data.level}</dd>
                </div>
                <div>
                  <dt>升级成功率</dt>
                  <dd>{formatPetNumber(data.chance)}%</dd>
                </div>
                <div>
                  <dt>升级消耗</dt>
                  <dd>{data.max ? '已满级' : `${formatPetNumber(data.cost)} 积分`}</dd>
                </div>
              </dl>
              <div className={forgeStyles.entries}>
                {!data.entries.length && <p className={styles.feedback}>此部位暂无词条。</p>}
                {data.entries.map((entry) => (
                  <div
                    className={forgeStyles.entry}
                    data-locked={entry.locked}
                    data-grade={entry.grade ?? 'unknown'}
                    key={entry.number}
                  >
                    <span>
                      <span className={forgeStyles.name}>
                        <span
                          className={forgeStyles.grade}
                          aria-label={`词条品质：${entry.grade === null ? '未分级' : gradeNames[entry.grade]}`}
                        >
                          {entry.grade === null ? '未分级' : gradeNames[entry.grade]}
                        </span>
                        <span>{entry.name}</span>
                      </span>
                      <small>{entry.locked ? '已锁定 · 刷新时保留' : '可刷新'}</small>
                    </span>
                    <strong>{formatPetStat(entry.name, entry.value, true)}</strong>
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
              </div>
              <p className={styles.muted}>
                刷新基础消耗 100 积分，每条锁定词条额外消耗 50 积分；已锁定词条不会被刷新。
              </p>
              <div className={styles.actions}>
                <ConfirmAction
                  disabled={data.max}
                  label={data.max ? '已达最高等级' : `升级 · ${formatPetNumber(data.cost)} 积分`}
                  description={`消耗 ${formatPetNumber(data.cost)} 积分尝试升级，成功概率 ${formatPetNumber(data.chance)}%，失败也可能消耗积分。`}
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
