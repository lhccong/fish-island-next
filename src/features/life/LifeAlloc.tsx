import { randomAllocation } from '@/domain/life';
import { Shuffle } from 'lucide-react';
import { properties } from './display';
import styles from './Life.module.css';

import { TalentCard } from './TalentCard';
import type { LifeController } from './useLife';
const CONFIG = { points: 20, spirit: 5, pull: 10, min: 3, max: 3, allocate: 10 };
const propertyKeys = ['charm', 'intelligence', 'strength', 'money', 'spirit'] as const;

export function LifeAlloc({
  allocation,
  setAllocation,
  replaced,
  pickedPointBonus,
  remaining,
  start,
}: LifeController) {
  return (
    <div className={styles.container}>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <span>属性分配</span>
          <b className={remaining === 0 ? styles.good : styles.bad}>剩余 {remaining} 点</b>
        </div>
        <div className={styles.talentGrid}>
          {Array.from(replaced.talents).map((id) => (
            <TalentCard key={id} id={id} />
          ))}
        </div>
        <div className={styles.allocateGrid}>
          {propertyKeys.map((key) => (
            <label key={key}>
              <span>{properties[key]}</span>
              <input
                type="number"
                min={0}
                max={CONFIG.allocate}
                value={allocation[key]}
                onChange={(event) =>
                  setAllocation((prev) => ({
                    ...prev,
                    [key]: Math.max(0, Math.min(CONFIG.allocate, Number(event.target.value) || 0)),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.randomButton}
            onClick={() =>
              setAllocation(randomAllocation(CONFIG.points + pickedPointBonus, CONFIG.allocate))
            }
          >
            <Shuffle size={16} aria-hidden="true" />
            随机分配
          </button>
          <button
            type="button"
            disabled={remaining !== 0}
            className={remaining === 0 ? styles.primary : styles.disabled}
            onClick={start}
          >
            开始新人生
          </button>
        </div>
      </section>
    </div>
  );
}
