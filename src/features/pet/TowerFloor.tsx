import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PanelDialog } from './PanelDialog';
import { PetSprite } from './PetSprite';
import { ChallengerStats } from './ChallengerStats';
import styles from './PixelBattle.module.css';

export function TowerFloor({
  service,
  floor,
  onClose,
}: {
  service: PetPort;
  floor: number;
  onClose: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => service.towerFloor(floor, signal),
    [service, floor],
  );
  const resource = usePetResource(load);
  return (
    <PanelDialog
      title={`第 ${floor} 层守卫`}
      description="查看守卫属性，为下一次挑战做好准备。"
      appearance="pixel"
      onClose={onClose}
    >
      <ResourceView state={resource.state} reload={resource.reload}>
        {(monster) => (
          <div className={styles.bossInfo}>
            <PetSprite url={monster.url} name={monster.name} size={112} />
            <h3>{monster.name}</h3>
            <ChallengerStats fighter={monster} />
          </div>
        )}
      </ResourceView>
    </PanelDialog>
  );
}
