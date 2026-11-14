import { LockKeyhole } from 'lucide-react';
import { isMature, remainingTime, type Land, type Crop } from '@/domain/farm';
import { PixelPlant } from './PixelPlant';
import { CropArtwork } from './CropArtwork';
import { FieldGround } from './FieldGround';
import { FarmScenery } from './FarmScenery';
import styles from './Farm.module.css';
export function FarmScene({
  lands,
  crops,
  now,
  disabled,
  onLand,
}: {
  lands: Land[];
  crops: Crop[];
  now: number;
  disabled: boolean;
  onLand: (land: Land, trigger: HTMLButtonElement) => void;
}) {
  const sorted = lands.slice().sort((a, b) => a.index - b.index);
  return (
    <section className={styles.scene} aria-label="农场田地">
      <FarmScenery />
      <div className={styles.field}>
        <FieldGround lands={sorted} columns={6} />
        <FieldGround lands={sorted} columns={3} />
        {sorted.map((land) => {
          const mature = isMature(land, now);
          const label = land.locked
            ? '未解锁'
            : mature
              ? '可收获'
              : land.status === 1
                ? remainingTime(land.harvestTime, now)
                : '待播种';
          return (
            <button
              type="button"
              key={land.id}
              className={styles.plot}
              data-locked={land.locked}
              data-mature={mature}
              disabled={disabled}
              onClick={(event) => onLand(land, event.currentTarget)}
              aria-label={`${land.index}号地 ${land.cropName || ''} ${label}`}
            >
              <span className={styles.plotNumber}>{String(land.index).padStart(2, '0')}</span>
              {land.locked ? (
                <LockKeyhole className={styles.lock} size={24} aria-hidden="true" />
              ) : land.status === 0 ? (
                <PixelPlant empty />
              ) : (
                <CropArtwork
                  mature={mature}
                  icon={crops.find((c) => c.id === land.cropId)?.icon ?? ''}
                />
              )}
              <strong>{land.locked ? '待开垦' : land.cropName || '空地'}</strong>
              <small>{label}</small>
            </button>
          );
        })}
      </div>
      <div className={styles.fence} aria-hidden="true" />
    </section>
  );
}
