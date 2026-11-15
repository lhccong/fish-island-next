import type { ForumComment, ForumPost, ForumPage } from '@/domain/forum';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('论坛数据格式异常，请重试');
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
export function id(value: unknown): string {
  if (
    (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value))) ||
    !/^[1-9]\d*$/.test(String(value))
  )
    throw new Error('论坛编号异常，请重试');
  return String(value);
}
export function count(value: unknown): number {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0)
    throw new Error('论坛数量异常，请重试');
  return n;
}
export function safeUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export function post(value: unknown): ForumPost {
  const data = record(value);
  const user = data.user ? record(data.user) : {};
  return {
    id: id(data.id),
    title: text(data.title),
    content: text(data.content),
    summary: text(data.summary),
    cover: safeUrl(data.coverImage),
    tags: Array.isArray(data.tagList)
      ? data.tagList.filter((v): v is string => typeof v === 'string')
      : [],
    authorId: id(data.userId ?? user.id),
    author: text(user.userName) || '岛友',
    avatar: safeUrl(user.userAvatar),
    createdAt: text(data.createTime),
    likes: count(data.thumbNum ?? 0),
    favourites: count(data.favourNum ?? 0),
    comments: count(data.commentNum ?? 0),
    views: count(data.viewNum ?? 0),
    liked: data.hasThumb === true,
    saved: data.hasFavour === true,
    featured: data.isFeatured === 1,
  };
}
export function comment(value: unknown): ForumComment {
  const data = record(value);
  const user = data.user ? record(data.user) : {};
  return {
    id: id(data.id),
    authorId: id(data.userId ?? user.id),
    author: text(user.userName) || '岛友',
    content: text(data.content),
    createdAt: text(data.createTime),
    liked: data.hasThumb === true,
    likes: count(data.thumbNum ?? 0),
    childCount: count(data.childCount ?? 0),
  };
}
export function page<T>(value: unknown, decode: (v: unknown) => T): ForumPage<T> {
  const data = record(value);
  if (!Array.isArray(data.records)) throw new Error('论坛列表格式异常，请重试');
  return { items: data.records.map(decode), total: count(data.total) };
}
