import type { Companion } from '@/domain/pet';
import { boundedPercent } from '@/domain/pet';
import { PetSprite } from './PetSprite';
import styles from './PetWorkspace.module.css';

export function CompanionSummary({ pet }: { pet: Companion }) {
  return (
    <div className={styles.summary}>
      <div className={styles.portrait}>
        <PetSprite url={pet.url} name={pet.name} size={60} />
      </div>
      <div className={styles.identity}>
        <span className={styles.eyebrow}>岛屿伙伴</span>
        <h2>
          {pet.name}
          <small>Lv.{pet.level}</small>
        </h2>
        <div className={styles.vitals}>
          <span>
            饱食 <meter min={0} max={100} value={boundedPercent(pet.hunger)} aria-label="饱食" />
            {pet.hunger}
          </span>
          <span>
            心情 <meter min={0} max={100} value={boundedPercent(pet.mood)} aria-label="心情" />
            {pet.mood}
          </span>
        </div>
      </div>
      <div className={styles.experience}>
        <strong>{pet.exp}</strong>
        <span>当前经验</span>
      </div>
    </div>
  );
}
