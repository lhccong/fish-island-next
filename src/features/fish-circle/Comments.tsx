import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Comment, FishCirclePort } from '@/domain/fish-circle';
import { usePage } from './use-page';
import { useOperation } from './use-operation';
import { CommentComposer } from './CommentComposer';
import { MediaGrid } from './MediaGrid';
import { CircleAvatar } from './CircleAvatar';
import { formatMomentTime } from './format-time';
import type { CommentTarget } from './comment-target';
import { useCommentTarget } from './use-comment-target';
import styles from './Comments.module.css';
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
  const { result, refresh, loadMore, loadingMore, error: pageError, hasMore } = usePage(load);
  const [expanded, setExpanded] = useState(!!target);
  const [replyOverrides, setReplyOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [reply, setReply] = useState<Comment | null>(null);
  const operation = useOperation();
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
    items: result.status === 'ready' ? result.data.items : [],
    ready: result.status === 'ready',
    hasMore,
    loadingMore,
    error: pageError,
    loadMore,
  });
  function commentCount(c: Comment): number {
    return 1 + c.children.reduce((n, child) => n + commentCount(child), 0);
  }
  function renderComment(c: Comment, ancestors: string[] = []) {
    const highlighted = anchor.match?.status === 'found' && anchor.match.id === c.id;
    const repliesOpen =
      replyOverrides.get(c.id) ??
      (anchor.match?.status === 'found' && anchor.match.ancestors.includes(c.id));
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
            <time>{formatMomentTime(c.createdAt)}</time>
            <button
              type="button"
              aria-label={`回复 ${c.userName}`}
              disabled={operation.pending}
              onClick={(event) => {
                replyElement.current = event.currentTarget.closest('li');
                onStartReply();
                setReply(c);
                setReplyOverrides((old) => {
                  const next = new Map(old);
                  for (const id of [...ancestors, c.id]) next.set(id, true);
                  return next;
                });
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
                        onCountChange(-commentCount(c));
                        refresh();
                      }
                    });
                }}
              >
                删除评论
              </button>
            )}
            {canManage && ancestors.length === 0 && (
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
        </div>
        {c.children.length > 0 && (
          <div className={styles.thread}>
            <button
              className={styles.more}
              type="button"
              aria-expanded={repliesOpen}
              onClick={() =>
                setReplyOverrides((old) => {
                  const next = new Map(old);
                  next.set(c.id, !repliesOpen);
                  return next;
                })
              }
            >
              {repliesOpen ? '收起回复' : `查看 ${c.children.length} 条回复`}
            </button>
            {repliesOpen && (
              <ul className={styles.replies}>
                {c.children.map((child) => renderComment(child, [...ancestors, c.id]))}
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
      <ScrollArea label="评论列表" gutter="reserved" className={styles.scroller || ''}>
        <div className={styles.scrollContent}>
          {anchor.message && (
            <p className={styles.targetNotice} role="status">
              {anchor.message}
            </p>
          )}
          {anchor.paused && (
            <Button variant="secondary" onClick={anchor.continueSearch}>
              继续查找该评论
            </Button>
          )}
          {result.status === 'loading' && <p role="status">正在加载评论…</p>}
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
                  {(expanded ? result.data.items : result.data.items.slice(0, 3)).map((c) =>
                    renderComment(c),
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
                error={pageError}
                onLoadMore={loadMore}
              />
            </>
          )}
        </div>
      </ScrollArea>
      {(composerOpen || reply) && (
        <CommentComposer
          service={service}
          momentId={momentId}
          reply={reply}
          onCancelReply={() => setReply(null)}
          onSent={() => {
            setReply(null);
            onCountChange(1);
            setNotice('评论成功');
            refresh();
          }}
        />
      )}

      {operation.error && <p role="alert">{operation.error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
