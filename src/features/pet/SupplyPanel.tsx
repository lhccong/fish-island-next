import { useCallback, useState } from 'react';
import type { PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { LotteryDetail } from './LotteryDetail';
import styles from './Lottery.module.css';

export function SupplyPanel({
  service,
  onChange,
  points,
}: {
  service: PetPort;
  onChange: (signal: AbortSignal) => Promise<void>;
  points?: number | undefined;
}) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [supplies, records] = await Promise.all([
        service.supplies(signal),
        service.drawRecords(1, signal),
      ]);
      return { supplies, lastDraw: records.records[0]?.time ?? '' };
    },
    [service],
  );
  const resource = usePetResource(load);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastDraw, setLastDraw] = useState('');
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {({ supplies, lastDraw: serverLastDraw }) => {
        if (!supplies.length)
          return <p className={styles.empty}>暂无开放的抽奖转盘，请稍后再来。</p>;
        const active = supplies.some((s) => s.id === selected) ? selected : supplies[0]!.id;
        return (
          <>
            <div className={styles.toolbar}>
              <nav aria-label="抽奖转盘" className={styles.tabs}>
                {supplies.map((s) => (
                  <Button
                    key={s.id}
                    variant={active === s.id ? 'primary' : 'secondary'}
                    aria-pressed={active === s.id}
                    disabled={busy}
                    onClick={() => setSelected(s.id)}
                  >
                    {s.name}
                  </Button>
                ))}
              </nav>
              {points !== undefined && (
                <span className={styles.balance}>
                  可用积分 <strong>{points}</strong>
                </span>
              )}
            </div>
            <p className={styles.rule}>每天首次免费抽取一次，两个转盘任选其一，共享免费次数。</p>
            <LotteryDetail
              key={active}
              id={active}
              service={service}
              free={
                new Date(lastDraw || serverLastDraw).toDateString() !== new Date().toDateString()
              }
              onBusy={setBusy}
              onChange={(signal) => {
                setLastDraw(new Date().toISOString());
                return onChange(signal);
              }}
            />
          </>
        );
      }}
    </ResourceView>
  );
}
