import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PanelDialog } from './PanelDialog';
import { PetRankRow } from './PetRankRow';
import rankingStyles from './Rankings.module.css';
import styles from './Panels.module.css';

export function TowerRanks({
  service,
  userId,
  onClose,
}: {
  service: PetPort;
  userId: string;
  onClose: () => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.towerRanks(signal), [service]);
  const resource = usePetResource(load);
  return (
    <PanelDialog
      title="爬塔排行"
      description="按历史最高通关层数展示前 20 名。"
      appearance="pixel"
      onClose={onClose}
    >
      <ResourceView state={resource.state} reload={resource.reload}>
        {(ranks) => (
          <div>
            {!ranks.length && <p className={styles.muted}>还没有通关记录，登塔留下你的第一步。</p>}
            {!!ranks.length && (
              <ol className={rankingStyles.list}>
                {ranks.map((entry) => (
                  <PetRankRow
                    key={entry.userId}
                    rank={entry.rank}
                    name={entry.name}
                    avatar={entry.avatar}
                    mine={entry.userId === userId}
                    metric={`${entry.floor} 层`}
                  />
                ))}
              </ol>
            )}
          </div>
        )}
      </ResourceView>
    </PanelDialog>
  );
}
