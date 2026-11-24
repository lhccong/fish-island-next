import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Comment, FishCirclePort } from '@/domain/fish-circle';
import { usePage } from './use-page';
import { useOperation } from './use-operation';
import { CommentComposer } from './CommentComposer';
import { CommentLikeButton } from './CommentLikeButton';
import { MediaGrid } from './MediaGrid';
import { CircleAvatar } from './CircleAvatar';
import { formatMomentTime } from './format-time';
import { applyCommentLikes } from './comment-ranking';
import type { CommentTarget } from './comment-target';
import { useCommentTarget } from './use-comment-target';
import styles from './Comments.module.css';

function collectReplies(comment: Comment): Comment[] {
  const replies: Comment[] = [];
  const pending = comment.children.slice().reverse();
  for (let next = pending.pop(); next; next = pending.pop()) {
    replies.push(next);
    for (const child of next.children.slice().reverse()) pending.push(child);
  }
  return replies;
}

interface Props {
  target?: CommentTarget | null;
  composerOpen: boolean;
  momentId: string;
  userId: string;
  canManage: boolean;
  admin: boolean;
  onCountChange: (delta: number) => void;
  onStartReply: () => void;
  service: FishCirclePort;
}
export function Comments({
  composerOpen,
  momentId,
  userId,
  canManage,
  admin,
  onCountChange,
  onStartReply,
  service,
  target = null,
}: Props) {
  const load = useCallback(
    (p: number, signal: AbortSignal) => service.comments(momentId, p, signal),
    [service, momentId],
  );
  const { result, refresh: reload, loadMore, loadingMore, error, hasMore } = usePage(load);
  const [likes, setLikes] = useState<ReadonlyMap<string, boolean>>(new Map());
  const comments = useMemo(
    () => (result.status === 'ready' ? applyCommentLikes(result.data.items, likes) : []),
    [result, likes],
  );
  const threads = useMemo(
    () => comments.map((comment) => ({ comment, replies: collectReplies(comment) })),
    [comments],
  );
  function refresh() {
    setLikes(new Map());
    reload();
  }
  const [expanded, setExpanded] = useState(!!target);
  const visibleThreads = expanded ? threads : threads.slice(0, 3);
  const [threadOverrides, setThreadOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [reply, setReply] = useState<{ comment: Comment; rootId: string } | null>(null);
  const operation = useOperation();
  const like = useOperation();
  const [notice, setNotice] = useState('');
  const container = useRef<HTMLElement>(null);
  const replyElement = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!reply) return;
    const frame = requestAnimationFrame(() => {
      const element = replyElement.current;
      if (!element?.isConnected) return;
      const viewport = element.closest<HTMLElement>('[data-radix-scroll-area-viewport]');
      if (!viewport) return;
      const top = element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
      const bottom = top + element.getBoundingClientRect().height;
      const delta = top < 0 ? top : Math.max(0, bottom - viewport.clientHeight);
      viewport.scrollBy({ top: delta, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [reply]);
  const anchor = useCommentTarget({
    container,
    target,
    items: comments,
    ready: result.status === 'ready',
    hasMore,
    loadingMore,
    error,
    loadMore,
  });
  function setThreadOpen(rootId: string, open: boolean) {
    setThreadOverrides((old) => new Map(old).set(rootId, open));
  }
  async function setLiked(id: string, liked: boolean) {
    const ok = await like.run((signal) => service.setCommentLiked(id, liked, signal));
    if (ok) setLikes((previous) => new Map(previous).set(id, liked));
  }
  function renderComment(c: Comment, rootId: string, replies?: Comment[]) {
    const highlighted = anchor.match?.status === 'found' && anchor.match.id === c.id;
    const repliesOpen =
      threadOverrides.get(rootId) ??
      (anchor.match?.status === 'found' && anchor.match.ancestors[0] === rootId);
    return (
      <li
        key={c.id}
        className={styles.comment}
        data-comment-target={highlighted}
        data-comment-id={c.id}
        tabIndex={highlighted ? -1 : undefined}
      >
        <CircleAvatar name={c.userName} src={c.avatar} size="small" />
        <div className={styles.content}>
          {highlighted && <span className={styles.targetLabel}>通知中的评论</span>}
          <p className={styles.author}>
            <strong>{c.userName}</strong>
            {c.replyName && ` 回复 ${c.replyName}`} {c.top && ' · 置顶'}
          </p>
          <p className={styles.text}>{c.content}</p>
          <MediaGrid media={c.media} />
          <div className={styles.actions}>
            <div className={styles.actionMeta}>
              <time>{formatMomentTime(c.createdAt)}</time>
              <button
                type="button"
                aria-label={`回复 ${c.userName}`}
                disabled={operation.pending}
                onClick={(event) => {
                  replyElement.current = event.currentTarget.closest('li');
                  onStartReply();
                  setReply({ comment: c, rootId });
                  setThreadOpen(rootId, true);
                }}
              >
                回复
              </button>
              {(c.userId === userId || admin) && (
                <button
                  type="button"
                  disabled={operation.pending}
                  onClick={() => {
                    void operation
                      .run((signal) => service.commentAction('delete', c.id, false, signal))
                      .then((ok) => {
                        if (ok) {
                          setNotice('评论已删除');
                          onCountChange(-1 - (replies ?? collectReplies(c)).length);
                          refresh();
                        }
                      });
                  }}
                >
                  删除评论
                </button>
              )}
              {canManage && c.id === rootId && (
                <button
                  type="button"
                  disabled={operation.pending}
                  onClick={() => {
                    void operation
                      .run((signal) => service.commentAction('top', c.id, !c.top, signal))
                      .then((ok) => {
                        if (ok) refresh();
                      });
                  }}
                >
                  {c.top ? '取消评论置顶' : '置顶评论'}
                </button>
              )}
            </div>
            {c.reaction && (
              <CommentLikeButton
                reaction={c.reaction}
                disabled={like.pending}
                onToggle={(liked) => void setLiked(c.id, liked)}
              />
            )}
          </div>
        </div>
        {!!replies?.length && (
          <div className={styles.thread}>
            <Button
              className={styles.threadToggle || ''}
              variant="inline"
              aria-expanded={repliesOpen}
              onClick={() => setThreadOpen(rootId, !repliesOpen)}
            >
              {repliesOpen ? '收起回复' : `查看 ${replies.length} 条回复`}
            </Button>
            {repliesOpen && (
              <ul className={styles.replies}>
                {replies.map((child) => renderComment(child, rootId))}
              </ul>
            )}
          </div>
        )}
      </li>
    );
  }
  return (
    <section
      ref={container}
      className={styles.comments}
      aria-label="评论区"
      data-composing={composerOpen || !!reply}
    >
      <h3 className={styles.heading}>评论</h3>
      {(composerOpen || reply) && (
        <CommentComposer
          service={service}
          momentId={momentId}
          reply={reply?.comment ?? null}
          onCancelReply={() => setReply(null)}
          onSent={() => {
            if (reply) setThreadOpen(reply.rootId, true);
            setReply(null);
            onCountChange(1);
            setNotice('评论成功');
            refresh();
          }}
        />
      )}
      <ScrollArea label="评论列表" gutter="reserved" className={styles.scroller || ''}>
        <div className={styles.scrollContent}>
          {anchor.message && (
            <p className={styles.targetNotice} role="status">
              {anchor.searching ? (
                <LoadingIndicator compact>{anchor.message}</LoadingIndicator>
              ) : (
                anchor.message
              )}
            </p>
          )}
          {anchor.paused && (
            <Button variant="secondary" onClick={anchor.continueSearch}>
              继续查找该评论
            </Button>
          )}
          {result.status === 'loading' && <LoadingIndicator>正在加载评论…</LoadingIndicator>}
          {result.status === 'error' && (
            <p role="alert">
              {result.message}
              <Button variant="secondary" onClick={refresh}>
                重试评论
              </Button>
            </p>
          )}
          {result.status === 'ready' && (
            <>
              {result.data.items.length ? (
                <ul className={styles.commentList}>
                  {visibleThreads.map(({ comment, replies }) =>
                    renderComment(comment, comment.id, replies),
                  )}
                </ul>
              ) : (
                <p>暂无评论，来聊两句吧</p>
              )}
              {result.data.items.length > 3 && !expanded && (
                <button className={styles.more} type="button" onClick={() => setExpanded(true)}>
                  查看更多 {result.data.total - 3} 条评论
                </button>
              )}
              <InfiniteScroll
                enabled={
                  (!target ||
                    anchor.match?.status === 'found' ||
                    anchor.match?.status === 'ambiguous') &&
                  (expanded || result.data.items.length <= 3)
                }
                label="评论"
                hasMore={hasMore}
                loading={loadingMore}
                error={error}
                onLoadMore={loadMore}
              />
            </>
          )}
        </div>
      </ScrollArea>
      {operation.error && <p role="alert">{operation.error}</p>}
      {like.pending && <LoadingIndicator compact>处理中…</LoadingIndicator>}
      {like.error && <p role="alert">{like.error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
