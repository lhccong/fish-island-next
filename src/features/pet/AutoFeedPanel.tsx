import { useCallback, useState } from 'react';
import type { AutoFeed, PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import styles from './Panels.module.css';

export function AutoFeedPanel({ service, petId }: { service: PetPort; petId: string }) {
  const load = useCallback(
    (signal: AbortSignal) => service.autoFeed(petId, signal),
    [service, petId],
  );
  const resource = usePetResource(load);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(data) => <AutoFeedForm service={service} petId={petId} initial={data} />}
    </ResourceView>
  );
}
function AutoFeedForm({
  service,
  petId,
  initial,
}: {
  service: PetPort;
  petId: string;
  initial: AutoFeed | null;
}) {
  const [value, setValue] = useState<AutoFeed>(
    initial ?? { enabled: false, foodCode: '', threshold: 30, foodName: '', remaining: 0 },
  );
  const operation = usePetOperation();
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void operation.run(
          async (signal) => {
            await service.saveAutoFeed(petId, value, signal);
            const saved = await service.autoFeed(petId, signal);
            if (!saved) throw new Error('配置已提交，但回读失败，请关闭面板后重新查看');
            return saved;
          },
          '自动喂食设置已保存',
          setValue,
        );
      }}
    >
      {!initial && <p>尚未设置自动喂食。食物编号可在物品资料中确认。</p>}
      <label>
        食物编号
        <input
          required
          maxLength={100}
          value={value.foodCode}
          onChange={(event) => setValue({ ...value, foodCode: event.target.value.trim() })}
        />
      </label>
      <label>
        触发饱食值（1–99）
        <input
          type="number"
          min={1}
          max={99}
          required
          value={value.threshold}
          onChange={(event) => setValue({ ...value, threshold: Number(event.target.value) })}
        />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) => setValue({ ...value, enabled: event.target.checked })}
        />
        启用自动喂食
      </label>
      <p className={styles.muted}>
        由服务端执行，关闭页面后仍以服务端设置为准。
        {value.foodName && `当前食物：${value.foodName}，剩余 ${value.remaining} 份。`}
      </p>
      <OperationNotice notice={operation.notice} />
      <div className={styles.actions}>
        <Button
          type="submit"
          disabled={
            operation.pending || !value.foodCode || value.threshold < 1 || value.threshold > 99
          }
        >
          {operation.pending ? '保存中…' : '保存设置'}
        </Button>
      </div>
    </form>
  );
}
