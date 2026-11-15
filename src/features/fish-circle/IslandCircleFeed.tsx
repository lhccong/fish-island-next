import { UsersRound, Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { MomentCard } from './MomentCard';
import { useIslandCircle } from './island-circle-context';
import styles from './IslandCircleFeed.module.css';

export function IslandCircleFeed({ active }: { active: boolean }) {
  const { page, service, user, overrides, patch, publish, onViewUser } = useIslandCircle();
  return (
    <section className={styles.feed} aria-label="海岛鱼小圈">
      <div className={styles.heading}>
        <h3>
          <UsersRound size={18} aria-hidden="true" />
          鱼小圈
        </h3>
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
