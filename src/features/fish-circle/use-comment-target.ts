import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Comment } from '@/domain/fish-circle';
import { findCommentTarget, type CommentTarget } from './comment-target';

export function useCommentTarget({
  target,
  items,
  ready,
  hasMore,
  loadingMore,
  error,
  loadMore,
  container,
}: {
  target: CommentTarget | null;
  items: Comment[];
  ready: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  error: string;
  loadMore: () => void;
  container: RefObject<HTMLElement | null>;
}) {
  const positioned = useRef(false);
  const [limit, setLimit] = useState(200);
  const match = useMemo(() => (target ? findCommentTarget(items, target) : null), [items, target]);
  useEffect(() => {
    if (
      ready &&
      match?.status === 'missing' &&
      hasMore &&
      !loadingMore &&
      !error &&
      items.length < limit
    )
      loadMore();
  }, [ready, match, hasMore, loadingMore, error, items.length, limit, loadMore]);
  useEffect(() => {
    if (match?.status !== 'found' || positioned.current) return;
    const frame = requestAnimationFrame(() => {
      const element = container.current?.querySelector<HTMLElement>('[data-comment-target="true"]');
      if (!element) return;
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
      element.focus({ preventScroll: true });
      positioned.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [match, container]);
  const message =
    !target || !ready || match?.status === 'found'
      ? ''
      : error
        ? '定位评论失败，请重试下方评论加载。'
        : match?.status === 'ambiguous'
          ? '有多条相同评论，暂时无法唯一定位。'
          : !hasMore
            ? '未找到这条评论，可能已删除或内容已修改。'
            : items.length >= limit
              ? '评论较多，尚未找到通知中的评论。'
              : '正在查找通知中的评论…';
  return {
    match,
    message,
    paused: !!target && match?.status === 'missing' && hasMore && items.length >= limit,
    continueSearch: () => setLimit(items.length + 200),
  };
}
