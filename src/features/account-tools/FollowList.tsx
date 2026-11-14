import { useCallback, useState } from 'react';
import type { AccountToolsPort } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { useOperation } from './use-operation';
import { Feedback } from './Feedback';
import styles from './Tools.module.css';
export function FollowList({
  port,
  kind,
  onBack,
}: {
  port: AccountToolsPort;
  kind: 'following' | 'followers';
  onBack: () => void;
}) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => port.follows(kind, page, signal),
    [port, kind],
  );
  const pages = useInfinitePages(load);
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const operation = useOperation();
  return (
    <div className={styles.body}>
      <ScrollArea
        label={kind === 'following' ? '我的关注' : '我的粉丝'}
        gutter="reserved"
        className={styles.scroll ?? ''}
      >
        <div className={styles.fields}>
          {pages.result.status === 'loading' && <p role="status">正在读取列表…</p>}
          {pages.result.status === 'error' && (
            <div>
              <p role="alert">{pages.result.message}</p>
              <Button variant="secondary" onClick={pages.refresh}>
                重试
              </Button>
            </div>
          )}
          {pages.result.status === 'ready' && (
            <>
              {!pages.result.data.items.length && (
                <div className={styles.empty}>
                  <p role="status">暂无{kind === 'following' ? '关注' : '粉丝'}。</p>
                </div>
              )}
              {pages.result.data.items.map((user) => (
                <div className={styles.row} key={user.id}>
                  <div className={styles.avatar}>
                    <SourceAvatar name={user.name} src={user.avatar || null} />
                  </div>
                  <div className={styles.text}>
                    {user.name}
                    <p>{user.profile}</p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={operation.busy}
                    onClick={() => {
                      void operation.run(async (signal) => {
                        const following = await port.toggleFollow(user.id, signal);
                        if (!signal.aborted)
                          setChanged((old) => ({ ...old, [user.id]: following }));
                      });
                    }}
                  >
                    {(changed[user.id] ?? user.following) ? '取消关注' : '关注'}
                  </Button>
                </div>
              ))}
              <InfiniteScroll
                hasMore={pages.hasMore}
                loading={pages.loadingMore}
                error={pages.error}
                onLoadMore={pages.loadMore}
                label="关注列表"
              />
            </>
          )}
        </div>
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
