import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PanelDialog } from './PanelDialog';
import styles from './Panels.module.css';

export function BossRanks({
  service,
  bossId,
  onClose,
}: {
  service: PetPort;
  bossId: string;
  onClose: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => service.bossRanks(bossId, signal),
    [service, bossId],
  );
  const resource = usePetResource(load);
  return (
    <PanelDialog
      title="首领贡献排行"
      description="按服务端记录展示本次首领挑战的伤害贡献。"
      onClose={onClose}
    >
      <ResourceView state={resource.state} reload={resource.reload}>
        {(ranks) => (
          <div className={styles.stack}>
            {!ranks.length && <p className={styles.muted}>暂无贡献记录。</p>}
            {ranks.map((entry) => (
              <div className={styles.rankRow} key={entry.userId}>
                <span className={styles.rank}>{entry.rank}</span>
                <div>
                  <strong>{entry.name}</strong>
                  <small>{entry.owner}</small>
                </div>
                <span>伤害 {entry.damage}</span>
              </div>
            ))}
          </div>
        )}
      </ResourceView>
    </PanelDialog>
  );
}
