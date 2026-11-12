import type { CircleReminder, Comment } from '@/domain/fish-circle';

export type CommentTarget = Pick<
  CircleReminder,
  'senderId' | 'senderName' | 'content' | 'image' | 'createdAt'
>;
export type CommentMatch =
  { status: 'found'; id: string; ancestors: string[] } | { status: 'missing' | 'ambiguous' };

export function findCommentTarget(comments: Comment[], target: CommentTarget): CommentMatch {
  const matches: { comment: Comment; ancestors: string[] }[] = [];
  function visit(items: Comment[], ancestors: string[]) {
    for (const comment of items) {
      const authorMatches = target.senderId
        ? comment.userId === target.senderId
        : comment.userName === target.senderName;
      if (
        authorMatches &&
        comment.content.trim() === target.content.trim() &&
        (!target.image || comment.media.some((media) => media.url === target.image)) &&
        (target.content.trim() || target.image)
      )
        matches.push({ comment, ancestors });
      visit(comment.children, [...ancestors, comment.id]);
    }
  }
  visit(comments, []);
  const timestamp = (value: string) => Date.parse(value.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T'));
  const timed = matches.filter(
    ({ comment }) => timestamp(comment.createdAt) === timestamp(target.createdAt),
  );
  const candidates = matches.length > 1 && timed.length ? timed : matches;
  const candidate = candidates[0];
  return candidates.length === 1 && candidate
    ? { status: 'found', id: candidate.comment.id, ancestors: candidate.ancestors }
    : { status: candidates.length ? 'ambiguous' : 'missing' };
}
