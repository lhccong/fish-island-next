import { useCallback, useState } from 'react';
import type { BattleTarget, PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PetSprite } from './PetSprite';
import { PixelLandscape } from './PixelLandscape';
import { BossRanks } from './BossRanks';
import { ChallengerStats } from './ChallengerStats';
import styles from './PixelBattle.module.css';

export function BossList({
  service,
  onSelect,
}: {
  service: PetPort;
  onSelect: (target: BattleTarget) => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.bosses(signal), [service]);
  const resource = usePetResource(load);
  const [ranking, setRanking] = useState<string | null>(null);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(bosses) => (
        <>
          <div className={styles.battleHeader}>
            <p className={styles.note}>每次挑战最多 10 回合，每位首领每日可挑战一次。</p>
            <Button variant="secondary" onClick={resource.reload}>
              刷新首领
            </Button>
          </div>
          {!bosses.length && (
            <div className={styles.empty}>
              <h3>首领暂未出现</h3>
              <p>暂无可挑战的首领，稍后刷新再来看看。</p>
            </div>
          )}
          <div className={styles.bosses}>
            {bosses.map((boss) => (
              <article className={styles.bossCard} key={boss.id}>
                <div className={styles.bossPortrait}>
                  <PixelLandscape />
                  <PetSprite url={boss.url} name={boss.name} size={120} />
                </div>
                <div className={styles.bossInfo}>
                  <h3>{boss.name}</h3>
                  <ChallengerStats fighter={boss} />
                  <div className={styles.controls}>
                    <Button
                      disabled={boss.health <= 0}
                      onClick={() => onSelect({ kind: 'boss', id: boss.id })}
                    >
                      {boss.health <= 0 ? '首领已被击败' : '开始挑战'}
                    </Button>
                    <Button variant="secondary" onClick={() => setRanking(boss.id)}>
                      贡献排行
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {ranking && (
            <BossRanks service={service} bossId={ranking} onClose={() => setRanking(null)} />
          )}
        </>
      )}
    </ResourceView>
  );
}
