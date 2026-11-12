import type { DonationPage, PayOrder } from '@/domain/about';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('关于服务返回的数据格式异常');
  return value as Record<string, unknown>;
}
export const text = (value: unknown) => (typeof value === 'string' ? value : '');
function amount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error('服务返回的金额异常');
  return value;
}
function count(value: unknown): number {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 0)
    throw new Error('服务返回的分页总数异常');
  return parsed;
}
function id(value: unknown): string {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  throw new Error('服务返回的编号异常');
}
export function safeUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export function decodeDonations(value: unknown): DonationPage {
  const data = record(value);
  if (!Array.isArray(data.records)) throw new Error('服务返回的榜单格式异常');
  return {
    total: count(data.total ?? 0),
    records: data.records.map((value) => {
      const item = record(value);
      const user = item.donorUser ? record(item.donorUser) : {};
      return {
        id: id(item.id),
        amount: amount(item.amount ?? 0),
        name: text(user.userName) || '匿名用户',
        avatar: safeUrl(user.userAvatar),
        frame: safeUrl(user.avatarFramerUrl),
        remark: text(item.remark),
        createdAt: text(item.createTime),
      };
    }),
  };
}
export function decodeOrder(value: unknown): PayOrder {
  const data = record(value);
  return {
    id: id(data.tradeOrderId),
    amount: amount(data.totalFee),
    status: text(data.status),
    payUrl: safeUrl(data.payUrl),
    qrCode: safeUrl(data.urlQrcode),
  };
}
