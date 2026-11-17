import { Shovel, Sparkles } from 'lucide-react';
import { treasureSites, type TreasureSiteId, type TreasureState } from '@/domain/pet';
import styles from './Treasure.module.css';

export function CampTreasureSites({
  active,
  animating,
  available,
  onDig,
}: {
  active: TreasureState['active'];
  animating: boolean;
  available: boolean;
  onDig: (site: TreasureSiteId) => void;
}) {
  return (
    <div className={styles.sites}>
      {treasureSites.map((site) => (
        <button
          type="button"
          key={site.id}
          aria-label={`${site.name}挖宝`}
          title={`${site.name} · 挖宝 5 秒`}
          disabled={!available}
          className={styles.site}
          data-active={active?.siteId === site.id}
          style={{ left: `${site.x}%`, top: `${site.y}%` }}
          onClick={() => onDig(site.id)}
        >
          <Shovel size={21} aria-hidden="true" />
          <span>{site.name}</span>
        </button>
      ))}
      {active &&
        (() => {
          const site = treasureSites.find((site) => site.id === active.siteId)!;
          return (
            <div
              key={active.id}
              className={styles.effects}
              data-animating={animating}
              aria-hidden="true"
              style={{ left: `${site.x}%`, top: `${site.y}%` }}
            >
              <Shovel className={styles.shovel} size={34} />
              <i />
              <i />
              <i />
              <Sparkles className={styles.sparkles} size={24} />
            </div>
          );
        })()}
    </div>
  );
}
