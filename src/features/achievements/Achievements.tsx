import type { Achievement, AchievementPort } from '@/domain/achievements';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { AchievementBadge } from './AchievementBadge';
import { useAchievements } from './use-achievements';
import styles from './Achievements.module.css';

function formatPoints(points: number) {
  return points.toLocaleString('zh-CN');
}

function AchievementCard({ item }: { item: Achievement }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeading}>
        <span className={styles.badge}>
          <AchievementBadge icon={item.icon} />
        </span>
        <div>
          <h2>{item.name}</h2>
          <p>
            {item.label} · 每 {item.interval} 级奖 {formatPoints(item.points)} 积分
          </p>
        </div>
      </div>
      <ul className={styles.tracks}>
        {item.tracks.map((track) => (
          <li key={track.id} className={styles.track}>
            <span>
              {track.label && <strong>{track.label} · </strong>}
              {track.level > 0 ? `${track.level} 级` : '尚未开始'}
            </span>
            <span>
              {track.next === null
                ? '全部达成'
                : track.enabled
                  ? `下一档 ${track.next} 级`
                  : '强化暂未开放'}
            </span>
            <span className={styles.reward} data-ready={track.claimablePoints > 0}>
              {track.claimablePoints > 0
                ? `可领 ${formatPoints(track.claimablePoints)} 积分`
                : track.claimedTiers > 0
                  ? `已领 ${formatPoints(track.claimedTiers * item.points)} 积分`
                  : '暂无可领取奖励'}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Achievements({
  service,
  refreshUser,
}: {
  service: AchievementPort;
  refreshUser: (signal: AbortSignal) => Promise<void>;
}) {
  const { catalog, pending, feedback, retry, claim } = useAchievements(service, refreshUser);
  const items = catalog.status === 'ready' ? catalog.summary.achievements : [];
  const claimable = items.reduce(
    (total, item) => total + item.tracks.reduce((sum, track) => sum + track.claimablePoints, 0),
    0,
  );
  return (
    <section className={styles.center}>
      <ScrollArea className={styles.scroll ?? ''} label="成就列表" gutter="reserved">
        {catalog.status === 'loading' && <LoadingIndicator>正在读取成就…</LoadingIndicator>}
        {catalog.status === 'error' && (
          <div className={styles.state}>
            <p role="alert">{catalog.message}</p>
            <Button variant="secondary" onClick={retry}>
              重试
            </Button>
          </div>
        )}
        {catalog.status === 'ready' &&
          (items.length > 0 ? (
            <div className={styles.grid}>
              {items.map((item) => (
                <AchievementCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <p className={styles.state}>暂无成就</p>
          ))}
      </ScrollArea>
      {items.length > 0 && (
        <div className={styles.footer}>
          <div>
            <strong>可领取 {formatPoints(claimable)} 积分</strong>
            {feedback && (
              <p role={feedback.error ? 'alert' : 'status'} data-error={feedback.error}>
                {feedback.text}
              </p>
            )}
          </div>
          <Button
            aria-label="一键领取"
            disabled={pending || claimable === 0}
            onClick={() => void claim()}
          >
            {pending ? <LoadingIndicator compact>领取中…</LoadingIndicator> : '一键领取'}
          </Button>
        </div>
      )}
    </section>
  );
}
