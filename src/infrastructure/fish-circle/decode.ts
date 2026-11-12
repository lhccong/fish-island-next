import {
  CircleError,
  type Moment,
  type CircleReminder,
  type Comment,
  type Page,
  type Media,
} from '@/domain/fish-circle';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CircleError('鱼小圈数据格式异常');
  return value as Record<string, unknown>;
}
export const text = (v: unknown): string => (typeof v === 'string' ? v : '');
export function id(v: unknown): string {
  if ((typeof v === 'string' && v.trim()) || (typeof v === 'number' && Number.isSafeInteger(v)))
    return String(v);
  throw new CircleError('鱼小圈数据缺少有效编号');
}
export function safeUrl(v: unknown): string {
  try {
    const url = new URL(text(v));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
export function media(v: unknown): Media[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new CircleError('媒体数据格式异常');
  return v.flatMap((item: unknown) => {
    const m = record(item);
    const url = safeUrl(m.url);
    return url && (m.type === 'image' || m.type === 'video')
      ? [{ type: m.type, url } as Media]
      : [];
  });
}
export function moment(v: unknown): Moment {
  const m = record(v);
  return {
    id: id(m.id),
    userId: id(m.userId),
    userName: text(m.userName) || '岛友',
    avatar: safeUrl(m.userAvatar),
    content: text(m.content),
    createdAt: text(m.createTime),
    location: text(m.location),
    media: media(m.mediaJson),
    liked: m.liked === true,
    likes: count(m.likeNum),
    likeNames: text(m.likeUserNames),
    comments: count(m.commentNum),
    top: m.isTop === 1,
    visibility: count(m.visibility),
  };
}
export function comment(v: unknown): Comment {
  return decodeComment(v, 0);
}
function decodeComment(v: unknown, depth: number): Comment {
  const c = record(v);
  if (depth > 8) throw new CircleError('评论层级异常');
  const images: Media[] = [];
  const content = text(c.content).replace(
    /\[img:(https?:\/\/[^\]\s]+)\]/g,
    (match, url: string) => {
      const safe = safeUrl(url);
      if (!safe) return match;
      images.push({ type: 'image', url: safe });
      return '';
    },
  );
  return {
    avatar: safeUrl(c.userAvatar),
    media: images,
    id: id(c.id),
    userId: id(c.userId),
    userName: text(c.userName) || '岛友',
    content,
    replyName: text(c.replyUserName),
    createdAt: text(c.createTime),
    top: c.isTop === 1,
    children: Array.isArray(c.children)
      ? c.children.map((x: unknown) => decodeComment(x, depth + 1))
      : [],
  };
}
export function page<T>(value: unknown, decode: (v: unknown) => T): Page<T> {
  const p = record(value);
  const total = typeof p.total === 'string' && /^\d+$/.test(p.total) ? Number(p.total) : p.total;
  if (
    !Array.isArray(p.records) ||
    typeof total !== 'number' ||
    !Number.isSafeInteger(total) ||
    total < 0
  )
    throw new CircleError('分页数据格式异常');
  return { items: p.records.map((item: unknown) => decode(item)), total };
}

export function reminder(value: unknown): CircleReminder {
  const r = record(value);
  const sender = r.senderUser == null ? {} : record(r.senderUser);
  const raw = text(r.sourceContent);
  const imageMatch = /\[img\]([^[]+)\[\/img\]|\[img:([^\]]+)\]/.exec(raw);
  if (r.state !== 0 && r.state !== 1) throw new CircleError('通知已读状态异常');
  return {
    id: id(r.id),
    senderId: r.senderId != null ? id(r.senderId) : sender.id != null ? id(sender.id) : '',
    senderName: text(sender.userName) || '系统通知',
    avatar: safeUrl(sender.userAvatar),
    content: raw.replace(/\[img\][^[]+\[\/img\]|\[img:[^\]]+\]/g, '').trim(),
    image: safeUrl(imageMatch?.[1] || imageMatch?.[2]),
    action: text(r.action),
    createdAt: text(r.createTime),
    read: r.state === 1,
    momentId: r.sourceType === 4 && r.sourceId != null ? id(r.sourceId) : '',
  };
}
