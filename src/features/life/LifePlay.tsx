import { achievements, events, talents } from '@/domain/life';
import { SkipForward } from 'lucide-react';
import styles from './Life.module.css';

import { PropertyList } from './LifeParts';
import type { LifeController } from './useLife';
const playbackModes = [
  { value: 'manual', label: '手动' },
  { value: 'auto', label: '自动' },
  { value: 'double', label: '自动两倍速' },
] as const;
const gradeClass = (value: number) => styles[`grade-${Math.max(0, Math.min(3, value))}`];
const formatEvent = (value: string, age: number) =>
  value.replace(/\{([^}]+)\}/g, (match, key) =>
    key === 'CurrentYear' ? String(new Date().getFullYear() + age) : match,
  );

export function LifePlay({
  game,
  logs,
  playbackMode,
  setPlaybackMode,
  playError,
  logRef,
  begin,
  next,
  goSummary,
}: LifeController) {
  return (
    <div className={styles.container}>
      <section className={styles.playPanel}>
        <PropertyList values={game!.props.current} includeAge living={game!.life > 0} />
        {playError && (
          <div role="alert">
            {playError}
            <button type="button" className={styles.textButton} onClick={begin}>
              重新开始
            </button>
          </div>
        )}
        <div
          className={styles.logs}
          ref={logRef}
          onClick={playbackMode === 'manual' ? next : undefined}
        >
          {logs.map((log, index) => (
            <article key={index}>
              <b>{log.age}岁</b>
              <div>
                {log.talents.map((id) => (
                  <p key={`t${id}`} className={styles.talentLog}>
                    [天赋] {talents.get(id)?.name}：{talents.get(id)?.description}
                  </p>
                ))}
                {log.events.map((id) => (
                  <p key={`e${id}`} className={gradeClass(events.get(id)?.grade || 0)}>
                    {formatEvent(events.get(id)?.event || '', log.age)}
                  </p>
                ))}
                {log.achievements.map((id) => (
                  <p key={`a${id}`} className={styles.achievementLog}>
                    [成就] {achievements.get(id)?.name}：{achievements.get(id)?.description}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className={styles.playControls}>
          {game!.life > 0 ? (
            <>
              <fieldset
                className={styles.playbackModes}
                disabled={!!playError}
                aria-label="人生推进模式"
              >
                {playbackModes.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="life-playback"
                      value={option.value}
                      checked={playbackMode === option.value}
                      onChange={() => setPlaybackMode(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <button
                type="button"
                className={styles.primary}
                disabled={playbackMode !== 'manual' || !!playError}
                onClick={next}
              >
                <SkipForward size={16} aria-hidden="true" />
                下一年
              </button>
            </>
          ) : (
            <button type="button" className={styles.primary} onClick={goSummary}>
              人生总结
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
