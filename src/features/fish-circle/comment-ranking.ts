import type { Comment } from '@/domain/fish-circle';

const commentIds = new Intl.Collator('en', { numeric: true });

export function applyCommentLikes(
  comments: Comment[],
  likes: ReadonlyMap<string, boolean>,
): Comment[] {
  if (!likes.size) return comments;
  let changed = false;
  const updated = comments.map((comment) => {
    const children = applyCommentLikes(comment.children, likes);
    const liked = likes.get(comment.id);
    const reaction =
      liked !== undefined && comment.reaction && liked !== comment.reaction.liked
        ? { liked, likes: Math.max(0, comment.reaction.likes + (liked ? 1 : -1)) }
        : comment.reaction;
    if (reaction === comment.reaction && children === comment.children) return comment;
    changed = true;
    return { ...comment, reaction, children };
  });
  return changed
    ? updated.sort(
        (a, b) =>
          Number(b.top) - Number(a.top) ||
          (b.reaction?.likes ?? 0) - (a.reaction?.likes ?? 0) ||
          b.createdAt.localeCompare(a.createdAt) ||
          commentIds.compare(b.id, a.id),
      )
    : comments;
}
