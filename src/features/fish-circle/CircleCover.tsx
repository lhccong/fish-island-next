import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import type { CircleProfile, FishCirclePort } from '@/domain/fish-circle';
import { CircleAvatar } from './CircleAvatar';
import { FollowControl } from './FollowControl';
import styles from './CircleCover.module.css';
interface Props {
  actions: ReactNode;
  service: FishCirclePort;
  userId: string;
  fallbackName: string;
  fallbackAvatar: string;
  own: boolean;
  filtered: boolean;
  onBack: () => void;
  onViewSelf: () => void;
}
type State =
  { status: 'loading' } | { status: 'ready'; profile: CircleProfile } | { status: 'error' };
export function CircleCover({
  actions,
  service,
  userId,
  fallbackName,
  fallbackAvatar,
  own,
  filtered,
  onBack,
  onViewSelf,
}: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [failedCover, setFailedCover] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState({ status: 'loading' });
      try {
        const profile = await service.profile(userId, controller.signal);
        if (!controller.signal.aborted) setState({ status: 'ready', profile });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    }
    void load();
    return () => controller.abort();
  }, [service, userId, revision]);
  const profile = state.status === 'ready' ? state.profile : null;
  const name = profile?.name || fallbackName;
  const cover = profile?.cover && profile.cover !== failedCover ? profile.cover : '';
  return (
    <section
      className={styles.cover}
      aria-label="鱼小圈封面"
      aria-busy={state.status === 'loading'}
    >
      {cover ? (
        <img
          className={styles.background}
          src={cover}
          alt="鱼小圈封面"
          referrerPolicy="no-referrer"
          onError={() => setFailedCover(cover)}
        />
      ) : (
        <Camera className={styles.watermark} size={100} strokeWidth={1} aria-hidden="true" />
      )}
      <div className={styles.shade} />
      <div className={styles.actions}>{actions}</div>
      {filtered && (
        <button aria-label="返回全部动态" className={styles.back} type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span className={styles.backLabel}>返回全部动态</span>
        </button>
      )}
      {state.status === 'error' && (
        <button className={styles.retry} type="button" onClick={() => setRevision(revision + 1)}>
          封面资料加载失败，重试
        </button>
      )}
      {state.status === 'loading' && (
        <span className={styles.loading} role="status">
          正在加载封面资料…
        </span>
      )}
      <div className={styles.profile}>
        <div className={styles.info}>
          <h2>{name}</h2>
          {!own && (
            <div className={styles.follow}>
              <FollowControl service={service} userId={userId} />
            </div>
          )}
        </div>
        {own ? (
          <button
            className={styles.avatarButton}
            type="button"
            aria-label="查看我的鱼小圈"
            onClick={onViewSelf}
          >
            <CircleAvatar name={name} src={profile?.avatar || fallbackAvatar} size="cover" />
          </button>
        ) : (
          <CircleAvatar name={name} src={profile?.avatar || fallbackAvatar} size="cover" />
        )}
      </div>
    </section>
  );
}
