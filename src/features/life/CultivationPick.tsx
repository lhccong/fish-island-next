import { cultivationTalents, drawCultivationTalents, realms } from '@/domain/life';
import { ArrowRight, Sparkles, Swords } from 'lucide-react';
import styles from './Life.module.css';

import type { CultivationController } from './Cultivation';
export function CultivationPick({
  drawn,
  setDrawn,
  picked,
  setStep,
  talentCard,
}: CultivationController) {
  return (
    <>
      {!drawn.length ? (
        <div className={styles.drawStage}>
          <div className={styles.cardDeck} aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className={styles.cardBack}>
                <Swords size={22} strokeWidth={1.5} />
              </div>
            ))}
          </div>
          <h3>一介凡人，也可问道长生</h3>
          <button
            type="button"
            className={`${styles.primary} ${styles.drawButton}`}
            onClick={() => setDrawn(drawCultivationTalents())}
          >
            <Sparkles size={18} aria-hidden="true" />
            十连抽
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className={styles.pickStatus}>
            <h3>选择你的仙缘</h3>
            <span aria-live="polite">
              已选 <b>{picked.length}</b> / 3
            </span>
          </div>
          <div className={`${styles.talentGrid} ${styles.pickGrid}`}>
            {drawn.map((id) => talentCard(id, true))}
          </div>
          <footer className={styles.pickFooter}>
            <div className={styles.pickedSlots}>
              {[0, 1, 2].map((index) => (
                <span key={index} className={picked[index] ? styles.filledSlot : ''}>
                  {picked[index]
                    ? cultivationTalents.find((item) => item.id === picked[index])?.name
                    : `仙缘 ${index + 1}`}
                </span>
              ))}
            </div>
            <button
              type="button"
              disabled={picked.length !== 3}
              className={picked.length === 3 ? styles.primary : styles.disabled}
              onClick={() => setStep('alloc')}
            >
              分配属性
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </footer>
        </>
      )}
      <div className={styles.realmRoad}>
        <h3>长生道途</h3>
        <ol>
          {realms.slice(1).map((realm, index) => (
            <li key={realm.name}>
              <span>{index + 1}</span>
              {realm.name}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
