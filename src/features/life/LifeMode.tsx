import { realms } from '@/domain/life';
import { ArrowLeft, ArrowRight, LockKeyhole, RotateCcw, Swords, UserRound } from 'lucide-react';
import styles from './Life.module.css';

import type { LifeController } from './useLife';

export function LifeMode({ profile, setStep, resetRound, chooseMode }: LifeController) {
  return (
    <div className={styles.container}>
      <section className={styles.pickPanel}>
        <header className={styles.pickHeader}>
          <div>
            <span className={styles.pickEyebrow}>人生重开模拟器</span>
            <h2>选择重开模式</h2>
          </div>
          <button type="button" className={styles.backButton} onClick={() => setStep('home')}>
            <ArrowLeft size={16} aria-hidden="true" />
            返回首页
          </button>
        </header>
        <div className={`${styles.modeGrid} ${styles.lifeModes}`}>
          <button type="button" onClick={() => chooseMode('classic')}>
            <RotateCcw size={28} strokeWidth={1.5} aria-hidden="true" />
            <strong>经典模式</strong>
            <span>凡俗一生，百味人生</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.cultivationMode}
            onClick={() => {
              resetRound();
              setStep('cultivation');
            }}
          >
            <Swords size={28} strokeWidth={1.5} aria-hidden="true" />
            <strong>修仙模式</strong>
            <span>人界 · 灵界 · 仙界</span>
            <small>
              {profile.cultivation
                ? `历经 ${profile.cultivation.times} 世 · 最高 ${realms[profile.cultivation.bestRealm]?.name || '凡人'}`
                : '炼气十三层 · 问道长生'}
            </small>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={profile.times < 10}
            onClick={() => chooseMode('celebrity')}
          >
            <UserRound size={28} strokeWidth={1.5} aria-hidden="true" />
            <strong>名人模式</strong>
            <span>
              {profile.times < 10 ? `重开 10 次解锁 · ${profile.times}/10` : '前世古人，今生新途'}
            </span>
            {profile.times < 10 ? (
              <LockKeyhole size={18} aria-hidden="true" />
            ) : (
              <ArrowRight size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
