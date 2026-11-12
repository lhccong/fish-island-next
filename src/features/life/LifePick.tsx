import { talents } from '@/domain/life';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import styles from './Life.module.css';

import { TalentCard } from './TalentCard';
import type { LifeController } from './useLife';
const CONFIG = { points: 20, spirit: 5, pull: 10, min: 3, max: 3, allocate: 10 };

export function LifePick({
  pulled,
  picked,
  setPicked,
  begin,
  pull,
  submitTalents,
}: LifeController) {
  return (
    <div className={styles.container}>
      <section className={styles.pickPanel}>
        <header className={styles.pickHeader}>
          <div>
            <span className={styles.pickEyebrow}>经典模式</span>
            <h2>天赋抽取</h2>
          </div>
          <button type="button" className={styles.backButton} onClick={begin}>
            <ArrowLeft size={16} aria-hidden="true" />
            切换模式
          </button>
          <ol className={styles.progressSteps} aria-label="人生重开流程">
            <li aria-current="step">
              <b>1</b>天赋
            </li>
            <li>
              <b>2</b>属性
            </li>
            <li>
              <b>3</b>人生
            </li>
          </ol>
        </header>
        {!pulled.length ? (
          <div className={styles.drawStage}>
            <div className={styles.cardDeck} aria-hidden="true">
              {Array.from({ length: CONFIG.pull }, (_, index) => (
                <div key={index} className={styles.cardBack}>
                  <Sparkles size={22} strokeWidth={1.5} />
                </div>
              ))}
            </div>
            <h3>你的天赋，尚未揭晓</h3>
            <button
              type="button"
              className={`${styles.primary} ${styles.drawButton}`}
              onClick={pull}
            >
              <Sparkles size={18} aria-hidden="true" />
              十连抽
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <div className={styles.pickStatus}>
              <h3>选择你的天赋</h3>
              <span aria-live="polite">
                已选 <b>{picked.size}</b> / {CONFIG.max}
              </span>
            </div>
            <div className={`${styles.talentGrid} ${styles.pickGrid}`}>
              {pulled.map((id) => (
                <TalentCard
                  key={id}
                  id={id}
                  selected={picked.has(id)}
                  onClick={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else if (next.size < CONFIG.max) next.add(id);
                      return next;
                    })
                  }
                />
              ))}
            </div>
            <footer className={styles.pickFooter}>
              <div className={styles.pickedSlots} aria-label="已选天赋">
                {Array.from({ length: CONFIG.max }, (_, index) => {
                  const id = Array.from(picked)[index];
                  return (
                    <span key={index} className={id !== undefined ? styles.filledSlot : ''}>
                      {id !== undefined ? (
                        <>
                          <Check size={14} aria-hidden="true" />
                          {talents.get(id)?.name}
                        </>
                      ) : (
                        `天赋 ${index + 1}`
                      )}
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={picked.size !== CONFIG.min}
                className={picked.size === CONFIG.min ? styles.primary : styles.disabled}
                onClick={submitTalents}
              >
                分配属性
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
