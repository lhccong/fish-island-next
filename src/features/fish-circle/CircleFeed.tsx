import { useCallback, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { FishCirclePort } from '@/domain/fish-circle';
import { MomentCard } from './MomentCard';
import { MomentEditor } from './MomentEditor';
import { Camera, RefreshCw, Images, UserRound } from 'lucide-react';
import { CircleNotifications } from './CircleNotifications';
import { CircleCover } from './CircleCover';
import { PinnedMoments } from './PinnedMoments';
import { usePage } from './use-page';
import styles from './Circle.module.css';
interface Props {
  renderLayout: (slots: { header: ReactNode; content: ReactNode }) => ReactNode;
  service: FishCirclePort;
  user: AuthUser;
  userId: string;
  name: string;
  onViewUser: (id: string, name: string) => void;
}
export function CircleFeed({ service, user, userId, name, onViewUser, renderLayout }: Props) {
  const load = useCallback(
    (p: number, signal: AbortSignal) => service.list(p, userId, signal),
    [service, userId],
  );
  const { result, page, setPage, refresh } = usePage(load);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');
  const content = (
    <div className={styles.feed}>
      <CircleCover
        actions={
          <>
            <button
              type="button"
              aria-label="全部动态"
              title="全部动态"
              aria-pressed={!userId}
              onClick={() => onViewUser('', '')}
            >
              <Images size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="我的鱼小圈"
              title="我的鱼小圈"
              aria-pressed={userId === user.id}
              onClick={() => onViewUser(user.id, user.name)}
            >
              <UserRound size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="刷新动态"
              aria-label="刷新动态"
              disabled={result.status === 'loading'}
              onClick={() => {
                if (page !== 1) setPage(1);
                else refresh();
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
            <CircleNotifications service={service} user={user} onViewUser={onViewUser} />
            <button
              type="button"
              aria-label="发布动态"
              title="发布动态"
              onClick={() => setPublishing(true)}
            >
              <Camera size={16} aria-hidden="true" />
            </button>
          </>
        }
        service={service}
        userId={userId || user.id}
        fallbackName={name || user.name}
        fallbackAvatar={userId && userId !== user.id ? '' : user.avatarUrl || ''}
        own={!userId || userId === user.id}
        filtered={!!userId}
        onBack={() => onViewUser('', '')}
        onViewSelf={() => onViewUser(user.id, user.name)}
      />
      <div className={styles.layout}>
        {result.status === 'ready' && (
          <PinnedMoments
            moments={result.data.items.filter((m) => m.top)}
            onSelect={(id) => {
              const element = document.getElementById(`circle-moment-${id}`);
              element?.scrollIntoView({ block: 'start', behavior: 'instant' });
              element?.focus({ preventScroll: true });
            }}
          />
        )}
        <div className={styles.timeline}>
          {notice && <p role="status">{notice}</p>}
          {result.status === 'loading' && (
            <p className={styles.state} role="status">
              正在加载鱼小圈…
            </p>
          )}
          {result.status === 'error' && (
            <div className={styles.state} role="alert">
              <p>{result.message}</p>
              <button type="button" onClick={refresh}>
                重试动态
              </button>
            </div>
          )}
          {result.status === 'ready' && (
            <>
              {result.data.items.length ? (
                result.data.items.map((moment) => (
                  <MomentCard
                    key={moment.id}
                    moment={moment}
                    user={user}
                    service={service}
                    onRefresh={refresh}
                    onViewUser={onViewUser}
                  />
                ))
              ) : (
                <p className={styles.state}>还没有动态，分享第一条摸鱼日常吧</p>
              )}
              <div className={styles.pagination}>
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  上一页动态
                </button>
                <span>
                  第 {page} 页 · 共 {result.data.total} 条
                </span>
                <button
                  type="button"
                  disabled={page * 10 >= result.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  下一页动态
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {publishing && (
        <MomentEditor
          original={null}
          service={service}
          onClose={() => setPublishing(false)}
          onSaved={() => {
            setPublishing(false);
            setNotice('发布成功');
            if (page !== 1) setPage(1);
            else refresh();
          }}
        />
      )}
    </div>
  );
  return renderLayout({
    header: (
      <div className={styles.header}>
        <h1>鱼小圈</h1>
        <span>{name ? `${name}的动态` : '发现岛友的新鲜事'}</span>
      </div>
    ),
    content,
  });
}
