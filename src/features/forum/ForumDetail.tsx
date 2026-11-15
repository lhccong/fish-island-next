import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { ForumPort, ForumPost } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ForumMarkdown } from './ForumMarkdown';
import { ForumComments } from './ForumComments';
import { ForumRewards } from './ForumRewards';
import { ForumImage } from './ForumImage';
import { useOperation } from './use-operation';
import styles from './Forum.module.css';

export function ForumDetail({
  initial,
  service,
  user,
  onLogin,
  onEdit,
  onBack,
  onDeleted,
}: {
  initial: ForumPost;
  service: ForumPort;
  user: AuthUser | null;
  onLogin: () => void;
  onEdit: () => void;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [post, setPost] = useState(initial);
  const [remove, setRemove] = useState(false);
  const operation = useOperation();
  const owner = user?.id === post.authorId;
  function react(kind: 'like' | 'save') {
    if (!user) {
      onLogin();
      return;
    }
    void operation.run(async (signal) => {
      const delta = await service.react(post.id, kind, signal);
      if (!signal.aborted)
        setPost((p) =>
          kind === 'like'
            ? { ...p, liked: delta === 1, likes: Math.max(0, p.likes + delta) }
            : { ...p, saved: delta === 1, favourites: Math.max(0, p.favourites + delta) },
        );
    }, '互动状态已更新');
  }
  return (
    <ScrollArea label="帖子详情" gutter="reserved" className={styles.scroll ?? ''}>
      <article className={styles.page}>
        <Button variant="secondary" onClick={onBack}>
          返回帖子列表
        </Button>
        <header className={styles.detailHeader}>
          <div className={styles.tags}>
            {post.featured && <strong>精华</strong>}
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <h1>{post.title}</h1>
          <div className={styles.meta}>
            <span>{post.author}</span>
            <time>{post.createdAt.replace('T', ' ').slice(0, 16)}</time>
            <span>{post.views} 次阅读</span>
          </div>
        </header>
        {post.cover && <ForumImage src={post.cover} alt="帖子封面" />}
        <ForumMarkdown content={post.content} />
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={operation.busy}
            aria-pressed={post.liked}
            onClick={() => react('like')}
          >
            {post.liked ? '已赞' : '点赞'} {post.likes}
          </Button>
          <Button
            variant="secondary"
            disabled={operation.busy}
            aria-pressed={post.saved}
            onClick={() => react('save')}
          >
            {post.saved ? '已收藏' : '收藏'} {post.favourites}
          </Button>
          {owner && (
            <Button variant="secondary" onClick={onEdit}>
              编辑帖子
            </Button>
          )}
          {(owner || user?.role === 'admin') && (
            <Button variant="secondary" disabled={operation.busy} onClick={() => setRemove(true)}>
              删除帖子
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="secondary"
              disabled={operation.busy}
              onClick={() =>
                void operation.run(async (signal) => {
                  await service.feature(post.id, !post.featured, signal);
                  if (!signal.aborted) setPost((p) => ({ ...p, featured: !p.featured }));
                }, '精华状态已更新')
              }
            >
              {post.featured ? '取消加精' : '设为精华'}
            </Button>
          )}
          {user && <ForumRewards service={service} postId={post.id} owner={owner} />}
        </div>
        {operation.busy && <LoadingIndicator compact>正在更新帖子…</LoadingIndicator>}
        {operation.message && <p role="status">{operation.message}</p>}
        <ForumComments service={service} postId={post.id} user={user} onLogin={onLogin} />
        {remove && (
          <Dialog
            open
            title="删除帖子"
            description="确定删除这篇帖子吗？删除后无法恢复。"
            dismissLabel="关闭删除确认"
            showCloseAction={false}
            onOpenChange={(v) => {
              if (!operation.busy) setRemove(v);
            }}
          >
            <ScrollArea label="删除帖子确认" gutter="reserved">
              <p>{post.title}</p>
            </ScrollArea>
            {operation.message && <p role="alert">{operation.message}</p>}
            <div className={styles.actions}>
              <Button
                variant="secondary"
                disabled={operation.busy}
                onClick={() => setRemove(false)}
              >
                取消
              </Button>
              <Button
                disabled={operation.busy}
                onClick={() =>
                  void operation.run(async (signal) => {
                    await service.remove(post.id, signal);
                    if (!signal.aborted) onDeleted();
                  })
                }
              >
                {operation.busy ? (
                  <LoadingIndicator compact>正在删除…</LoadingIndicator>
                ) : (
                  '确认删除'
                )}
              </Button>
            </div>
          </Dialog>
        )}
      </article>
    </ScrollArea>
  );
}
