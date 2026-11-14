import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PanelDialog } from './PanelDialog';
import { PetRankRow } from './PetRankRow';
import rankingStyles from './Rankings.module.css';
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
      appearance="pixel"
    >
      <ResourceView state={resource.state} reload={resource.reload}>
        {(ranks) => (
          <div>
            {!ranks.length && <p className={styles.muted}>暂无贡献记录。</p>}
            {!!ranks.length && (
              <ol className={rankingStyles.list}>
                {ranks.map((entry) => (
                  <PetRankRow
                    key={entry.userId}
                    rank={entry.rank}
                    name={entry.name}
                    owner={entry.owner}
                    avatar={entry.avatar}
                    petUrl={entry.petUrl}
                    metric={`伤害 ${entry.damage}`}
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
