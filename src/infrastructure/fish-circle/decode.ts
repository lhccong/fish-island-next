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
  const root = decodeComment(v);
  const pending = [{ raw: record(v), decoded: root }];
  while (pending.length) {
    const { raw, decoded } = pending.pop()!;
    if (!Array.isArray(raw.children)) continue;
    for (const child of raw.children) {
      const next = decodeComment(child);
      decoded.children.push(next);
      pending.push({ raw: record(child), decoded: next });
    }
  }
  return root;
}
function decodeComment(v: unknown): Comment {
  const c = record(v);
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
    reaction:
      typeof c.liked === 'boolean' &&
      typeof c.likeNum === 'number' &&
      Number.isSafeInteger(c.likeNum) &&
      c.likeNum >= 0
        ? { liked: c.liked, likes: c.likeNum }
        : null,
    children: [],
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

function positiveLong(value: unknown): string | undefined {
  const candidate =
    typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : text(value);
  if (/^[1-9]\d{0,18}$/.test(candidate) && BigInt(candidate) <= 9223372036854775807n)
    return candidate;
}

function scriptTarget(r: Record<string, unknown>, content: string): string | undefined {
  if (r.sourceType !== 0 || String(r.senderId) !== '-1') return undefined;
  if (r.action === 'script_detection') return positiveLong(r.sourceId);
  if (r.action !== 'system' || String(r.sourceId) !== '-1') return undefined;
  const legacy =
    /^检测到用户 (?:[^\r\n]+:)?([1-9]\d{0,18}) (?:今日快速抢包次数达到 \d+ 次|[^\r\n]+间隔高度一致（标准差 \d+ms）)，已标记为脚本用户$/.exec(
      content,
    );
  return positiveLong(legacy?.[1]);
}

export function reminder(value: unknown): CircleReminder {
  const r = record(value);
  const sender = r.senderUser == null ? {} : record(r.senderUser);
  const raw = text(r.sourceContent);
  const imageMatch = /\[img\]([^[]+)\[\/img\]|\[img:([^\]]+)\]/.exec(raw);
  const isCommentLike = r.sourceType === 7 && r.action === 'like';
  const relatedMoment = text(r.url);
  const followUserId =
    r.action === 'follow' && (r.sourceType === 3 || r.sourceType === 0)
      ? (positiveLong(r.senderId) ?? positiveLong(sender.id) ?? positiveLong(r.url))
      : undefined;
  const scriptUserId = scriptTarget(r, raw);
  if (r.state !== 0 && r.state !== 1) throw new CircleError('通知已读状态异常');
  return {
    id: id(r.id),
    senderId: r.senderId != null ? id(r.senderId) : sender.id != null ? id(sender.id) : '',
    senderName: text(sender.userName) || '系统通知',
    avatar: safeUrl(sender.userAvatar),
    content: raw.replace(/\[img\][^[]+\[\/img\]|\[img:[^\]]+\]/g, '').trim(),
    image: safeUrl(imageMatch?.[1] || imageMatch?.[2]),
    action: isCommentLike ? 'comment-like' : text(r.action),
    createdAt: text(r.createTime),
    read: r.state === 1,
    momentId: isCommentLike
      ? /^[1-9]\d*$/.test(relatedMoment)
        ? relatedMoment
        : ''
      : r.sourceType === 4 && r.sourceId != null
        ? id(r.sourceId)
        : '',
    ...(isCommentLike && r.sourceId != null ? { commentId: id(r.sourceId) } : {}),
    ...(followUserId ? { followUserId } : {}),
    ...(scriptUserId ? { scriptUserId } : {}),
  };
}
