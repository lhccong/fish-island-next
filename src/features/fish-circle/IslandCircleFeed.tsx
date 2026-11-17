import { UsersRound, Pencil, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { MomentCard } from './MomentCard';
import { useIslandCircle } from './island-circle-context';
import styles from './IslandCircleFeed.module.css';

export function IslandCircleFeed({
  active,
  presentation = 'pixel',
  headingAction,
}: {
  active: boolean;
  presentation?: 'pixel' | 'classic';
  headingAction?: ReactNode;
}) {
  const { page, service, user, overrides, patch, publish, onViewUser } = useIslandCircle();
  return (
    <section className={styles.feed} aria-label="海岛鱼小圈" data-presentation={presentation}>
      <div className={styles.heading}>
        <div className={styles.headingTitle}>
          <h3>
            <UsersRound size={18} aria-hidden="true" />
            鱼小圈
          </h3>
          <Button
            variant="secondary"
            className={styles.refresh}
            aria-label="刷新动态"
            title="刷新动态"
            disabled={page.result.status === 'loading'}
            onClick={page.refresh}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </Button>
          {headingAction}
        </div>
        <Button variant="secondary" onClick={(event) => publish(event.currentTarget)}>
          <Pencil size={14} aria-hidden="true" />
          发动态
        </Button>
      </div>
      <div className={styles.scroll}>
        <ScrollArea label="海岛动态滚动区" gutter="reserved">
          <div className={styles.body} data-loading={page.result.status === 'loading'}>
            {page.result.status === 'loading' ? (
              <LoadingIndicator>正在加载动态…</LoadingIndicator>
            ) : page.result.status === 'error' ? (
              <div className={styles.state} role="alert">
                <p>{page.result.message}</p>
                <Button variant="secondary" onClick={page.refresh}>
                  重试动态
                </Button>
              </div>
            ) : (
              <>
                {page.result.data.items.length ? (
                  page.result.data.items.map((original) => {
                    const moment = { ...original, ...overrides[original.id] };
                    return (
                      <MomentCard
                        key={moment.id}
                        moment={moment}
                        user={user}
                        service={service}
                        variant="island"
                        islandStyle={presentation}
                        onRefresh={page.refresh}
                        onViewUser={(id) => onViewUser(id)}
                        onLikeChange={(liked, count) => patch(moment.id, { liked, likes: count })}
                        onCommentDelta={(delta) =>
                          patch(moment.id, { comments: Math.max(0, moment.comments + delta) })
                        }
                      />
                    );
                  })
                ) : (
                  <div className={styles.state}>
                    <p>还没有动态，分享第一条摸鱼日常吧</p>
                  </div>
                )}
                <InfiniteScroll
                  enabled={active}
                  label="动态"
                  hasMore={page.hasMore}
                  loading={page.loadingMore}
                  error={page.error}
                  onLoadMore={page.loadMore}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
