import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AccountToolsPort,
  FollowKind,
  FollowListTarget,
  FollowUser,
} from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { useOperation } from './use-operation';
import { Feedback } from './Feedback';
import styles from './Tools.module.css';
import details from './Details.module.css';

export function FollowList({
  port,
  kind,
  owner,
  onChange,
  onBack,
}: {
  port: Pick<AccountToolsPort, 'follows' | 'toggleFollow'>;
  kind: FollowKind;
  owner?: Pick<FollowListTarget, 'id' | 'name'>;
  onChange?: () => void;
  onBack: () => void;
}) {
  const ownerId = owner?.id;
  const load = useCallback(
    (page: number, signal: AbortSignal) => port.follows(kind, page, signal, ownerId),
    [port, kind, ownerId],
  );
  const pages = useInfinitePages(load);
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const operation = useOperation();
  const heading = useRef<HTMLHeadingElement>(null);
  const followingList = kind === 'following';
  const label = followingList ? '关注' : '粉丝';

  useEffect(() => heading.current?.focus(), []);

  function toggle(user: FollowUser) {
    void operation.run(async (signal) => {
      const following = await port.toggleFollow(user.id, signal);
      if (signal.aborted) return;
      onChange?.();
      if (followingList) {
        heading.current?.focus();
        pages.refresh();
        if (!following) operation.setNotice(`已取消关注 ${user.name}`);
      } else {
        setChanged((old) => ({ ...old, [user.id]: following }));
      }
    });
  }

  return (
    <div className={styles.body}>
      <h3 ref={heading} tabIndex={-1} className={details.followHeading} data-other={!!owner}>
        {owner ? `${owner.name}的${label}` : `我的${label}`}
      </h3>
      <ScrollArea label={`${label}列表`} gutter="reserved" className={styles.scroll ?? ''}>
        {pages.result.status === 'loading' ? (
          <LoadingIndicator>正在读取列表…</LoadingIndicator>
        ) : (
          <div className={styles.fields}>
            {pages.result.status === 'error' && (
              <div className={styles.feedback}>
                <p role="alert">{pages.result.message}</p>
                <Button variant="secondary" onClick={pages.refresh}>
                  重试
                </Button>
              </div>
            )}
            {pages.result.status === 'ready' &&
              (pages.result.data.items.length === 0 ? (
                <div className={styles.empty}>
                  <p role="status">暂无{label}。</p>
                </div>
              ) : (
                <>
                  <ul role="list" className={details.people}>
                    {pages.result.data.items.map((user) => {
                      const mutual = changed[user.id] ?? user.mutual;
                      return (
                        <li className={details.followRow} data-read-only={!onChange} key={user.id}>
                          <div className={styles.avatar}>
                            <SourceAvatar name={user.name} src={user.avatar || null} />
                          </div>
                          <div className={details.followUser}>
                            <div className={details.followIdentity}>
                              <span>{user.name}</span>
                              {mutual && <span className={details.status}>互相关注</span>}
                            </div>
                            {user.profile && <p>{user.profile}</p>}
                          </div>
                          {onChange && (
                            <Button
                              variant="secondary"
                              disabled={operation.busy}
                              onClick={() => toggle(user)}
                            >
                              {followingList || mutual ? '取消关注' : '回关'}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <InfiniteScroll
                    hasMore={pages.hasMore}
                    loading={pages.loadingMore}
                    error={pages.error}
                    onLoadMore={pages.loadMore}
                    label={`${label}列表`}
                  />
                </>
              ))}
          </div>
        )}
      </ScrollArea>
      <Feedback {...operation} />
      <div className={styles.actions}>
        <Button variant="secondary" disabled={operation.busy} onClick={onBack}>
          返回卡片
        </Button>
      </div>
    </div>
  );
}
