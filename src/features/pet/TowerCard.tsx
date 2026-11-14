import { useCallback, useState } from 'react';
import type { BattleTarget, PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PixelLandscape } from './PixelLandscape';
import { PetSprite } from './PetSprite';
import { TowerRanks } from './TowerRanks';
import { TowerFloor } from './TowerFloor';
import styles from './PixelBattle.module.css';

export function TowerCard({
  service,
  userId,
  onSelect,
}: {
  service: PetPort;
  userId: string;
  onSelect: (target: BattleTarget) => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.tower(signal), [service]);
  const resource = usePetResource(load);
  const [ranking, setRanking] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  return (
    <>
      <ResourceView state={resource.state} reload={resource.reload}>
        {(tower) => (
          <div className={styles.tower}>
            <div className={styles.battleHeader}>
              <p className={styles.note}>每日最多 10 次挑战，逐层突破更高纪录。</p>
              <Button variant="secondary" onClick={() => setRanking(true)}>
                爬塔排行
              </Button>
            </div>
            <section className={styles.towerBanner}>
              <PixelLandscape tower />
              <div>
                <span className={styles.floor}>
                  {String(tower.floor).padStart(2, '0')}
                  <small> F</small>
                </span>
                <p>
                  历史最高通关：{tower.floor} 层
                  {tower.maxOpenFloor > 0 ? ` / 开放 ${tower.maxOpenFloor} 层` : ''}
                </p>
                <h3>{tower.completed ? '已登临塔顶' : `向第 ${tower.nextFloor} 层进发`}</h3>
                <p>
                  {tower.completed
                    ? '当前开放的全部试炼已完成。'
                    : tower.next
                      ? `下一位对手：${tower.next.name}`
                      : '暂无下一层守卫资料，请刷新重试。'}
                </p>
              </div>
              {tower.next && !tower.completed && (
                <div>
                  <PetSprite url={tower.next.url} name={tower.next.name} size={128} />
                </div>
              )}
            </section>
            {tower.next && !tower.completed && (
              <>
                <dl className={styles.stats}>
                  <div>
                    <dt>守卫生命</dt>
                    <dd>{tower.next.health}</dd>
                  </div>
                  <div>
                    <dt>攻击</dt>
                    <dd>{tower.next.attack}</dd>
                  </div>
                  <div>
                    <dt>通关奖励 / 积分</dt>
                    <dd>{tower.next.reward}</dd>
                  </div>
                </dl>
                <div className={styles.controls}>
                  <Button variant="secondary" onClick={resource.reload}>
                    刷新进度
                  </Button>
                  <Button onClick={() => onSelect({ kind: 'tower' })}>开始试炼</Button>
                </div>
              </>
            )}
            {!tower.next && (
              <div className={styles.controls}>
                <Button variant="secondary" onClick={resource.reload}>
                  刷新进度
                </Button>
              </div>
            )}
            <h4>楼层预览</h4>
            <div className={styles.floorTrack} aria-label="附近楼层">
              {Array.from(
                { length: 5 },
                (_, i) => Math.max(1, (tower.nextFloor ?? tower.floor) - 2) + i,
              )
                .filter((value) => !tower.maxOpenFloor || value <= tower.maxOpenFloor)
                .map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`预览第 ${value} 层`}
                    aria-current={value === tower.nextFloor ? 'step' : undefined}
                    onClick={() => setFloor(value)}
                  >
                    {String(value).padStart(2, '0')} F
                  </button>
                ))}
            </div>
            <form
              className={styles.floorForm}
              onSubmit={(event) => {
                event.preventDefault();
                const value = Number(new FormData(event.currentTarget).get('floor'));
                if (
                  Number.isSafeInteger(value) &&
                  value >= 1 &&
                  (!tower.maxOpenFloor || value <= tower.maxOpenFloor)
                )
                  setFloor(value);
              }}
            >
              <label>
                查看指定楼层
                <input
                  name="floor"
                  aria-label="预览楼层"
                  type="number"
                  min={1}
                  max={tower.maxOpenFloor || undefined}
                  step={1}
                  defaultValue={tower.nextFloor ?? 1}
                  required
                />
              </label>
              <Button variant="secondary" type="submit">
                查看守卫
              </Button>
            </form>
          </div>
        )}
      </ResourceView>
      {ranking && (
        <TowerRanks service={service} userId={userId} onClose={() => setRanking(false)} />
      )}
      {floor !== null && (
        <TowerFloor service={service} floor={floor} onClose={() => setFloor(null)} />
      )}
    </>
  );
}
