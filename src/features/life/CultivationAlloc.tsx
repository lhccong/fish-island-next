const propertyKeys = ['charm', 'intelligence', 'strength', 'money', 'spirit'] as const;
import { cultivationProperties, randomAllocation } from '@/domain/life';
import { Shuffle } from 'lucide-react';
import styles from './Life.module.css';

import type { CultivationController } from './Cultivation';
export function CultivationAlloc({
  picked,
  allocation,
  setAllocation,
  remaining,
  start,
  talentCard,
}: CultivationController) {
  return (
    <div className={styles.cultivationAllocation}>
      <div className={styles.pickStatus}>
        <h3>先天禀赋</h3>
        <span aria-live="polite">
          剩余 <b>{remaining}</b> / 20 点
        </span>
      </div>
      <div className={styles.talentGrid}>{picked.map((id) => talentCard(id, false))}</div>
      <div className={styles.allocateGrid}>
        {propertyKeys.map((key) => (
          <label key={key}>
            <span>{cultivationProperties[key]}</span>
            <input
              type="number"
              min={0}
              max={10}
              value={allocation[key]}
              onChange={(event) =>
                setAllocation((previous) => ({
                  ...previous,
                  [key]: Math.min(10, Math.max(0, Math.trunc(Number(event.target.value) || 0))),
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
          onClick={() => setAllocation(randomAllocation(20, 10))}
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
          踏入仙途
        </button>
      </div>
    </div>
  );
}
