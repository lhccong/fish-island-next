import { useCallback, useState } from 'react';
import { PenLine, ListFilter } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import { ForumPostCard } from './ForumPostCard';
import type { ForumPort, ForumFilter } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ForumTags } from './ForumTags';
import { ForumTopics } from './ForumTopics';
import { ForumTabs } from './ForumTabs';
import styles from './Forum.module.css';

export function ForumList({
  service,
  user,
  onLogin,
  onOpen,
  onEdit,
  onCreate,
  revision,
}: {
  service: ForumPort;
  user: AuthUser | null;
  onLogin: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
  revision: number;
}) {
  const [filter, setFilter] = useState<ForumFilter>({ tab: 'latest', search: '', tag: '' });
  const [search, setSearch] = useState('');
  const [removed, setRemoved] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const load = useCallback(
    (page: number, signal: AbortSignal) => {
      void revision;
      return service.list(filter, page, signal);
    },
    [service, filter, revision],
  );
  const list = useInfinitePages(load);
  return (
    <ScrollArea label="论坛帖子" gutter="reserved" className={styles.scroll ?? ''}>
      <div className={styles.forumGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.panel} aria-label="论坛筛选">
            <ForumTags
              service={service}
              value={filter.tag}
              onChange={(tag) => setFilter((f) => ({ ...f, tag }))}
            />
            <div className={styles.searchToggle}>
              <Button
                variant="secondary"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((v) => !v)}
              >
                <ListFilter size={15} aria-hidden="true" />
                {searchOpen ? '收起搜索' : '展开搜索'}
              </Button>
            </div>
            {searchOpen && (
              <form
                className={styles.search}
                onSubmit={(e) => {
                  e.preventDefault();
                  setFilter((f) => ({ ...f, search: search.trim() }));
                }}
              >
                <input
                  aria-label="搜索帖子"
                  placeholder="搜索感兴趣的话题"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  搜索
                </Button>
              </form>
            )}
          </section>
          <section className={styles.panel} aria-label="帖子列表">
            <div className={styles.listHeader}>
              <ForumTabs
                value={filter.tab}
                onChange={(value) => {
                  if ((value === 'my' || value === 'saved') && !user) onLogin();
                  else setFilter((f) => ({ ...f, tab: value }));
                }}
              />
              <Button onClick={user ? onCreate : onLogin}>
                <PenLine size={15} aria-hidden="true" />
                发布帖子
              </Button>
            </div>
            {list.result.status === 'loading' ? (
              <div className={styles.status}>
                <LoadingIndicator>正在加载帖子…</LoadingIndicator>
              </div>
            ) : list.result.status === 'error' ? (
              <div className={styles.status} role="alert">
                <p>{list.result.message}</p>
                <Button onClick={list.refresh}>重试帖子</Button>
              </div>
            ) : (
              <>
                {!list.result.data.items.length && (
                  <div className={styles.status}>
                    <h2>还没有帖子</h2>
                    <p>
                      {filter.search || filter.tag
                        ? '换个关键词或标签试试。'
                        : '来分享你的第一个话题吧。'}
                    </p>
                  </div>
                )}
                <div className={styles.posts}>
                  {list.result.data.items
                    .filter((post) => !removed.includes(post.id))
                    .map((post) => (
                      <ForumPostCard
                        key={`${revision}:${post.id}`}
                        initial={post}
                        user={user}
                        service={service}
                        onLogin={onLogin}
                        onOpen={() => onOpen(post.id)}
                        onEdit={() => onEdit(post.id)}
                        onDeleted={() => setRemoved((ids) => [...ids, post.id])}
                      />
                    ))}
                </div>
                <InfiniteScroll
                  label="帖子"
                  hasMore={list.hasMore}
                  loading={list.loadingMore}
                  error={list.error}
                  onLoadMore={list.loadMore}
                />
              </>
            )}
          </section>
        </div>
        <ForumTopics service={service} onOpen={onOpen} />
      </div>
    </ScrollArea>
  );
}
