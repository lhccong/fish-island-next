const propertyKeys = ['charm', 'intelligence', 'strength', 'money', 'spirit'] as const;
import { cultivationProperties, realms } from '@/domain/life';
import { SkipForward, Trophy } from 'lucide-react';
import styles from './Life.module.css';

import type { CultivationController } from './Cultivation';
import { RealmStatus } from './RealmStatus';
export function CultivationPlay({
  game,
  logs,
  logRef,
  speed,
  setSpeed,
  error,
  advance,
  setStep,
}: CultivationController) {
  if (!game) return null;
  return (
    <>
      <RealmStatus game={game} />
      <div className={styles.cultivationAttributes}>
        {propertyKeys.map((key) => (
          <div key={key}>
            <span>{cultivationProperties[key]}</span>
            <b>{game.props.current[key]}</b>
          </div>
        ))}
      </div>
      <div
        className={`${styles.logs} ${styles.cultivationLogs}`}
        ref={logRef}
        aria-label="修行日志"
      >
        {logs.map((log, index) => (
          <article key={index}>
            <b>{log.age.toLocaleString()}岁</b>
            <p
              className={
                log.kind === 'realm'
                  ? styles.cultivationRealmLog
                  : log.kind === 'danger'
                    ? styles.achievementLog
                    : log.kind === 'good'
                      ? styles.talentLog
                      : undefined
              }
            >
              {log.text}
            </p>
          </article>
        ))}
      </div>
      <div className={styles.playControls}>
        {!game.cultivation.ending ? (
          <>
            <fieldset className={styles.playbackModes} aria-label="修行推进模式" disabled={!!error}>
              {(
                [
                  { value: 'manual', label: '手动' },
                  { value: 'auto', label: '自动' },
                  { value: 'double', label: '自动两倍速' },
                ] as const
              ).map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="cultivation-speed"
                    value={option.value}
                    checked={speed === option.value}
                    onChange={() => setSpeed(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              className={styles.primary}
              disabled={speed !== 'manual' || !!error}
              onClick={advance}
            >
              <SkipForward size={16} aria-hidden="true" />
              {game.cultivation.realm === 0
                ? '下一年'
                : `修行 ${realms[game.cultivation.realm]!.years.toLocaleString()} 年`}
            </button>
          </>
        ) : (
          <button type="button" className={styles.primary} onClick={() => setStep('summary')}>
            <Trophy size={16} aria-hidden="true" />
            此世总结
          </button>
        )}
      </div>
    </>
  );
}
