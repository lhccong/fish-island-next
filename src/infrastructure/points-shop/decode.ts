import { parseBubbleStyle } from '@/domain/chat';
import type { PointsRecord, ShopBubble, ShopItem, ShopPage } from '@/domain/points-shop';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('商城数据格式异常，请重试');
  return value as Record<string, unknown>;
}
function signedInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new Error('商城积分数据异常，请重试');
  return value;
}
function integer(value: unknown): number {
  const number = signedInteger(value);
  if (number < 0) throw new Error('商城积分数据异常，请重试');
  return number;
}
function id(value: unknown): string {
  if (
    (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value))) ||
    !/^[1-9]\d*$/.test(String(value))
  )
    throw new Error('商城记录编号异常，请重试');
  return String(value);
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function image(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}
export function decodeItem(value: unknown): ShopItem {
  const data = record(value);
  if (typeof data.name !== 'string' || !data.name.trim()) throw new Error('道具名称缺失');
  return {
    id: id(data.frameId),
    name: data.name,
    description: text(data.description),
    imageUrl: image(data.imgUrl),
    points: integer(data.points),
    supported: data.type === '1',
  };
}
export function decodePointsRecord(value: unknown): PointsRecord {
  const data = record(value);
  if (data.changeType !== 1 && data.changeType !== 2) throw new Error('积分变动类型异常');
  return {
    id: id(data.id),
    description: text(data.description) || text(data.sourceTypeText) || '积分变动',
    createdAt: text(data.createTime),
    change: integer(data.changePoints) * (data.changeType === 1 ? 1 : -1),
    available: integer(data.afterPoints) - signedInteger(data.afterUsedPoints),
  };
}
export function decodePage<T>(value: unknown, decode: (value: unknown) => T): ShopPage<T> {
  const data = record(value);
  if (!Array.isArray(data.records)) throw new Error('商城列表格式异常，请重试');
  const total =
    typeof data.total === 'string' && /^(?:0|[1-9]\d*)$/.test(data.total)
      ? Number(data.total)
      : data.total;
  return { items: data.records.map(decode), total: integer(total) };
}

export function decodeBubbles(value: unknown): ShopBubble[] {
  if (!Array.isArray(value)) throw new Error('气泡列表格式异常，请重试');
  const seen = new Set<string>();
  return value.flatMap((value) => {
    const item = record(value);
    const style = parseBubbleStyle(item.id, item.artwork);
    if (!style) return [];
    const expiresAt =
      item.expiresAt == null
        ? null
        : typeof item.expiresAt === 'string'
          ? Date.parse(item.expiresAt)
          : NaN;
    if (
      seen.has(style.id) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.equipped !== 'boolean' ||
      (expiresAt !== null && !Number.isFinite(expiresAt)) ||
      (item.equipped && expiresAt === null)
    ) {
      throw new Error('气泡权益格式异常，请重试');
    }
    seen.add(style.id);
    return [
      {
        ...style,
        name: item.name,
        points: integer(item.points),
        durationDays: integer(item.durationDays),
        expiresAt,
        equipped: item.equipped,
      },
    ];
  });
}
