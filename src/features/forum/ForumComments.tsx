import { useCallback, useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { ForumPort, ForumComment } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ForumMarkdown } from './ForumMarkdown';
import { useOperation } from './use-operation';
import styles from './Forum.module.css';
import { CommentReply } from './CommentReply';
import { useImageUpload } from './use-image-upload';
import { CommentUpload } from './CommentUpload';

export function ForumComments({
  service,
  postId,
  user,
  onLogin,
  rootId = null,
}: {
  service: ForumPort;
  postId: string;
  user: AuthUser | null;
  onLogin: () => void;
  rootId?: string | null;
}) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => service.comments(postId, rootId, page, signal),
    [service, postId, rootId],
  );
  const list = useInfinitePages(load);
  const [reactions, setReactions] = useState<Record<string, { liked: boolean; likes: number }>>({});
  const [content, setContent] = useState('');
  const [remove, setRemove] = useState<ForumComment | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const operation = useOperation();
  const upload = useImageUpload(service, (url) =>
    setContent((value) => `${value}\n[img]${url}[/img]`),
  );
  return (
    <section
      className={rootId ? styles.replies : styles.comments}
      aria-label={rootId ? '评论回复' : '帖子评论'}
    >
      {!rootId && <h2>评论</h2>}
      {!rootId && (
        <form
          className={styles.commentForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) {
              onLogin();
              return;
            }
            if (!content.trim()) return;
            void operation.run(async (signal) => {
              await service.reply(postId, content.trim(), null, null, signal);
              if (!signal.aborted) {
                setContent('');
                list.refresh();
              }
            }, '评论已发送');
          }}
        >
          <label className={styles.field}>
            说说你的看法
            <textarea
              rows={3}
              value={content}
              maxLength={4000}
              onChange={(e) => setContent(e.target.value)}
              onPaste={user ? upload.onPaste : undefined}
              disabled={operation.busy}
            />
          </label>
          <div className={styles.actions}>
            {user && (
              <CommentUpload
                busy={upload.busy}
                message={upload.message}
                disabled={operation.busy}
                onUpload={upload.upload}
              />
            )}
            <Button
              type="submit"
              disabled={operation.busy || upload.busy || (Boolean(user) && !content.trim())}
            >
              {operation.busy ? (
                <LoadingIndicator compact>正在发送…</LoadingIndicator>
              ) : user ? (
                '发送评论'
              ) : (
                '登录后评论'
              )}
            </Button>
          </div>
        </form>
      )}
      {operation.message && <p role="status">{operation.message}</p>}
      {list.result.status === 'loading' ? (
        <div className={styles.status}>
          <LoadingIndicator>正在加载评论…</LoadingIndicator>
        </div>
      ) : list.result.status === 'error' ? (
        <div role="alert">
          <p>{list.result.message}</p>
          <Button onClick={list.refresh}>重试评论</Button>
        </div>
      ) : (
        <>
          {!list.result.data.items.length && (
            <p className={styles.muted}>暂无{rootId ? '回复' : '评论'}，聊聊你的想法吧。</p>
          )}
          {list.result.data.items.map((item) => (
            <div className={styles.comment} key={item.id}>
              <div className={styles.meta}>
                <strong>{item.author}</strong>
                <time>{item.createdAt.replace('T', ' ').slice(0, 16)}</time>
              </div>
              <ForumMarkdown content={item.content} />
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  disabled={operation.busy}
                  aria-pressed={reactions[item.id]?.liked ?? item.liked}
                  onClick={() => {
                    if (!user) onLogin();
                    else
                      void operation.run(async (signal) => {
                        const delta = await service.react(item.id, 'comment', signal);
                        if (!signal.aborted) {
                          setReactions((values) => ({
                            ...values,
                            [item.id]: {
                              likes: Math.max(0, (values[item.id]?.likes ?? item.likes) + delta),
                              liked: delta === 1,
                            },
                          }));
                        }
                      }, '点赞状态已更新');
                  }}
                >
                  {(reactions[item.id]?.liked ?? item.liked) ? '已赞' : '赞'}{' '}
                  {reactions[item.id]?.likes ?? item.likes}
                </Button>
                <CommentReply
                  service={service}
                  postId={postId}
                  item={item}
                  rootId={rootId || item.id}
                  user={user}
                  onLogin={onLogin}
                  onSent={list.refresh}
                />
                {user && (user.id === item.authorId || user.role === 'admin') && (
                  <Button
                    variant="secondary"
                    disabled={operation.busy}
                    onClick={() => setRemove(item)}
                  >
                    删除评论
                  </Button>
                )}
                {!rootId && item.childCount > 0 && (
                  <Button
                    variant="secondary"
                    aria-expanded={expanded.includes(item.id)}
                    onClick={() =>
                      setExpanded((ids) =>
                        ids.includes(item.id)
                          ? ids.filter((id) => id !== item.id)
                          : [...ids, item.id],
                      )
                    }
                  >
                    {expanded.includes(item.id) ? '收起回复' : `查看回复 ${item.childCount}`}
                  </Button>
                )}
              </div>
              {!rootId && expanded.includes(item.id) && (
                <ForumComments
                  service={service}
                  postId={postId}
                  rootId={item.id}
                  user={user}
                  onLogin={onLogin}
                />
              )}
            </div>
          ))}
          <InfiniteScroll
            label={rootId ? '回复' : '评论'}
            hasMore={list.hasMore}
            loading={list.loadingMore}
            error={list.error}
            onLoadMore={list.loadMore}
          />
        </>
      )}
      {remove && (
        <Dialog
          open
          title="删除评论"
          description="确认删除这条评论？"
          dismissLabel="关闭删除确认"
          showCloseAction={false}
          onOpenChange={(open) => {
            if (!open && !operation.busy) setRemove(null);
          }}
        >
          <ScrollArea label="删除评论确认" gutter="reserved">
            <p>删除后无法恢复。</p>
          </ScrollArea>
          {operation.message && <p role="alert">{operation.message}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={operation.busy} onClick={() => setRemove(null)}>
              取消
            </Button>
            <Button
              disabled={operation.busy}
              onClick={() =>
                void operation.run(async (signal) => {
                  await service.removeComment(remove.id, signal);
                  if (!signal.aborted) {
                    setRemove(null);
                    list.refresh();
                  }
                }, '评论已删除')
              }
            >
              {operation.busy ? <LoadingIndicator compact>正在删除…</LoadingIndicator> : '确认删除'}
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
