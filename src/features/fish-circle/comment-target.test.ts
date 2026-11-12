import { describe, expect, it } from 'vitest';
import type { Comment } from '@/domain/fish-circle';
import { findCommentTarget, type CommentTarget } from './comment-target';

const target: CommentTarget = {
  senderId: '42',
  senderName: '岛友',
  content: '同一条评论',
  image: '',
  createdAt: '2026-11-12 10:00:00',
};
const comment = (id: string, patch: Partial<Comment> = {}): Comment => ({
  id,
  userId: '42',
  userName: '岛友',
  content: target.content,
  createdAt: target.createdAt,
  avatar: '',
  replyName: '',
  top: false,
  children: [],
  media: [],
  ...patch,
});
describe('notification comment matching', () => {
  it('matches sender identity and expands the entire nested path', () => {
    const tree = [
      comment('1', {
        userId: 'other',
        children: [
          comment('2', {
            content: 'parent',
            children: [comment('3')],
          }),
        ],
      }),
    ];
    expect(findCommentTarget(tree, target)).toEqual({
      status: 'found',
      id: '3',
      ancestors: ['1', '2'],
    });
  });
  it('falls back to a name only when sender identity is absent', () => {
    expect(findCommentTarget([comment('1', { userId: 'other' })], target).status).toBe('missing');
    expect(findCommentTarget([comment('1')], { ...target, senderId: '' }).status).toBe('found');
  });
  it('uses time to distinguish repeated content and rejects ambiguous matches', () => {
    expect(
      findCommentTarget([comment('1', { createdAt: '2026-11-12 09:00:00' }), comment('2')], target),
    ).toMatchObject({ id: '2' });
    expect(findCommentTarget([comment('1'), comment('2')], target)).toEqual({
      status: 'ambiguous',
    });
  });
  it('matches image-only comments by their attachment instead of all empty texts', () => {
    expect(
      findCommentTarget(
        [
          comment('1', {
            content: '',
            media: [{ type: 'image', url: 'https://example.com/a.png' }],
          }),
        ],
        { ...target, content: '', image: 'https://example.com/a.png' },
      ),
    ).toMatchObject({ id: '1' });
    expect(
      findCommentTarget([comment('1', { content: '' })], { ...target, content: '' }).status,
    ).toBe('missing');
  });
  it('does not highlight similar or edited comments', () => {
    expect(
      findCommentTarget([comment('1', { content: `${target.content}，已修改` })], target).status,
    ).toBe('missing');
  });
});
