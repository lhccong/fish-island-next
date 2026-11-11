import { useCallback, useState } from 'react';
import type { Comment, FishCirclePort } from '@/domain/fish-circle';
import { usePage } from './use-page';
import { useOperation } from './use-operation';
import { CommentComposer } from './CommentComposer';
import { MediaGrid } from './MediaGrid';
import { CircleAvatar } from './CircleAvatar';
import { formatMomentTime } from './format-time';
import styles from './Comments.module.css';
interface Props {
  composerOpen: boolean;
  momentId: string;
  userId: string;
  canManage: boolean;
  admin: boolean;
  onCountChange: (delta: number) => void;
  service: FishCirclePort;
}
export function Comments({
  composerOpen,
  momentId,
  userId,
  canManage,
  admin,
  onCountChange,
  service,
}: Props) {
  const load = useCallback(
    (p: number, signal: AbortSignal) => service.comments(momentId, p, signal),
    [service, momentId],
  );
  const { result, page, setPage, refresh } = usePage(load);
  const [expanded, setExpanded] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<ReadonlySet<string>>(new Set());
  const [reply, setReply] = useState<Comment | null>(null);
  const operation = useOperation();
  const [notice, setNotice] = useState('');
  function commentCount(c: Comment): number {
    return 1 + c.children.reduce((n, child) => n + commentCount(child), 0);
  }
  function renderComment(c: Comment, root: Comment = c) {
    return (
      <li key={c.id} className={styles.comment}>
        <CircleAvatar name={c.userName} src={c.avatar} size="small" />
        <div className={styles.content}>
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
              onClick={() => {
                setReply({ ...root, userId: c.userId, userName: c.userName });
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
            {canManage && (
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
          {c.children.length > 0 && (
            <>
              <button
                className={styles.more}
                type="button"
                aria-expanded={expandedReplies.has(c.id)}
                onClick={() =>
                  setExpandedReplies((old) => {
                    const next = new Set(old);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  })
                }
              >
                {expandedReplies.has(c.id) ? '收起回复' : `查看 ${c.children.length} 条回复`}
              </button>
              {expandedReplies.has(c.id) && (
                <ul className={styles.replies}>
                  {c.children.map((child) => renderComment(child, root))}
                </ul>
              )}
            </>
          )}
        </div>
      </li>
    );
  }
  return (
    <section className={styles.comments} aria-label="评论区">
      {result.status === 'loading' && <p role="status">正在加载评论…</p>}
      {result.status === 'error' && (
        <p role="alert">
          {result.message}
          <button type="button" onClick={refresh}>
            重试评论
          </button>
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
          {(expanded || result.data.total > 10) && (
            <div className={styles.pagination}>
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
                上一页评论
              </button>
              <span>第 {page} 页</span>
              <button
                type="button"
                disabled={page * 10 >= result.data.total}
                onClick={() => setPage(page + 1)}
              >
                下一页评论
              </button>
            </div>
          )}
        </>
      )}
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
            if (page !== 1) setPage(1);
            else refresh();
          }}
        />
      )}

      {operation.error && <p role="alert">{operation.error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
