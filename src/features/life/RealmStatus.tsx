import type { CultivationGame } from '@/domain/life';
import {
  breakthroughChance,
  lifespan,
  realmLabel,
  realms,
  requiredProgress,
  roots,
} from '@/domain/life';
import { Swords } from 'lucide-react';
import styles from './Life.module.css';

export function RealmStatus({ game }: { game: CultivationGame }) {
  const c = game.cultivation;
  const realm = realms[c.realm]!;
  const limit = lifespan(game);
  return (
    <div className={styles.realmStatus}>
      <div className={styles.realmTitle}>
        <div className={styles.realmEmblem}>
          <Swords size={28} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div>
          <span>
            {realm.world} · {c.realm === 0 ? '山村' : '青岚宗'}
          </span>
          <h2>{realmLabel(c)}</h2>
        </div>
        <span className={styles.rootLabel}>{c.realm === 0 ? '灵根未测' : roots[c.root]!.name}</span>
      </div>
      <div className={styles.cultivationMetrics}>
        <div>
          <span>年龄</span>
          <b>
            {game.props.current.age.toLocaleString()}
            <small> 岁</small>
          </b>
        </div>
        <div>
          <span>寿元上限</span>
          <b>{limit === null ? '无自然上限' : `${limit.toLocaleString()} 岁`}</b>
        </div>
        <div>
          <span>已渡天劫</span>
          <b>
            {c.tribulations}
            <small> 次</small>
          </b>
        </div>
        <div>
          <span>下次天劫</span>
          <b>
            {c.ending
              ? '此世已结'
              : c.nextTribulation === null
                ? '尚未降临'
                : `${c.nextTribulation.toLocaleString()} 岁`}
          </b>
        </div>
      </div>
      {!c.ending && (
        <div className={styles.cultivationProgress}>
          <div>
            <span>
              {c.realm === 0 ? '成长' : '修为'}{' '}
              <b>
                {Math.floor(c.progress).toLocaleString()} / {requiredProgress(c).toLocaleString()}
              </b>
            </span>
            <span>
              {c.realm === 0 ? '6 岁测灵根' : `大境界突破率 ${breakthroughChance(game)}%`}
            </span>
          </div>
          <progress
            max={requiredProgress(c)}
            value={c.progress}
            aria-label={c.realm === 0 ? '成长进度' : '修为进度'}
          />
        </div>
      )}
    </div>
  );
}
