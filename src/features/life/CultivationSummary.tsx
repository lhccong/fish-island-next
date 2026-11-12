import { achievements, cultivationEvents, endingNames, realms } from '@/domain/life';
import { ArrowRight, Check, Trophy, Zap } from 'lucide-react';
import styles from './Life.module.css';

import type { CultivationController } from './Cultivation';
import { RealmStatus } from './RealmStatus';
export function CultivationSummary({ game, profile, unlocked, finish }: CultivationController) {
  if (!game) return null;
  return (
    <>
      <div className={styles.cultivationEnding}>
        <Trophy size={36} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <span>此世结局</span>
          <h2>{endingNames[game.cultivation.ending!]}</h2>
        </div>
      </div>
      <RealmStatus game={game} />
      <div className={styles.realmRoad}>
        <h3>问道足迹</h3>
        <ol>
          {realms.slice(1).map((realm, index) => (
            <li
              key={realm.name}
              className={index + 1 <= game.cultivation.realm ? styles.realmReached : ''}
            >
              {index + 1 <= game.cultivation.realm ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <span>{index + 1}</span>
              )}
              {realm.name}
            </li>
          ))}
        </ol>
      </div>
      <p className={styles.muted}>
        修仙事件收集 {new Set([...(profile.cultivation?.events || []), ...game.events]).size} /{' '}
        {cultivationEvents.size}
      </p>
      <h3 className={styles.cultivationSectionTitle}>此世成就 · {unlocked.length}</h3>
      <div className={styles.cultivationBadges}>
        {unlocked.length ? (
          unlocked.map((id) => (
            <span key={id}>
              <Zap size={14} aria-hidden="true" />
              {achievements.get(id)?.name}
            </span>
          ))
        ) : (
          <span>暂无新成就</span>
        )}
      </div>
      <button type="button" className={styles.primary} onClick={finish}>
        再入轮回
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </>
  );
}
