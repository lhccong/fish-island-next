import type { HotEntry, HotSource } from '@/domain/hot-board';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('热榜数据格式异常');
  return value as Record<string, unknown>;
}

export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function decodeEntries(value: unknown, sourceId: string): HotEntry[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('热榜条目格式异常');
  const seen = new Set<string>();
  return value.flatMap((raw, index) => {
    const entry = record(raw);
    const title = text(entry.title);
    if (!title) return [];
    const url = safeHttpUrl(entry.url);
    const key = url ?? title;
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        id: `${sourceId}:${key}`,
        rank: index + 1,
        title,
        url,
        heat:
          typeof entry.followerCount === 'number' &&
          Number.isFinite(entry.followerCount) &&
          entry.followerCount >= 0
            ? entry.followerCount
            : null,
      },
    ];
  });
}

export function decodeHotBoard(payload: unknown): HotSource[] {
  const response = record(payload);
  if (response.code !== 0) throw new Error(text(response.message) || '获取热榜失败，请稍后重试');
  if (!Array.isArray(response.data)) throw new Error('热榜数据格式异常');
  const seen = new Set<string>();
  return response.data.flatMap((raw) => {
    const source = record(raw);
    const id =
      typeof source.id === 'number' && Number.isFinite(source.id)
        ? String(source.id)
        : text(source.id);
    const name = text(source.name);
    if (!id || !name || seen.has(id)) return [];
    seen.add(id);
    const updatedAt = text(source.updateTime);
    return [
      {
        id,
        name,
        badgeLabel: text(source.typeName) || name,
        category: text(source.categoryName) || '其他',
        iconUrl: safeHttpUrl(source.iconUrl),
        updatedAt: updatedAt && Number.isFinite(Date.parse(updatedAt)) ? updatedAt : null,
        entries: decodeEntries(source.data, id),
      },
    ];
  });
}
