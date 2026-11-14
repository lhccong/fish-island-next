import type { Crop, Farmer, Friend, Land, Visitor } from '@/domain/farm';
export function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('农场数据格式异常，请刷新');
  return v as Record<string, unknown>;
}
export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) v = Number(v);
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('农场数值异常，请刷新');
  return v;
}
export function id(v: unknown): string {
  if (typeof v === 'string' && /^\d+$/.test(v)) return v;
  if (typeof v === 'number' && Number.isSafeInteger(v) && v > 0) return String(v);
  throw new Error('农场编号异常，请刷新');
}
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const image = (v: unknown) => {
  const raw = text(v);
  return /^https?:\/\//.test(raw) || /^\/(?!\/)/.test(raw) ? raw : '';
};
const time = (v: unknown) => {
  if (!v) return null;
  const n = Date.parse(text(v));
  if (!Number.isFinite(n)) throw new Error('农场时间异常，请刷新');
  return n;
};
export function list<T>(v: unknown, decode: (v: unknown) => T): T[] {
  if (!Array.isArray(v)) throw new Error('农场列表异常，请刷新');
  return v.map(decode);
}
export function land(v: unknown): Land {
  const d = record(v);
  return {
    id: id(d.id),
    index: num(d.landIndex),
    locked: d.locked === 1,
    status: num(d.status),
    cropId: d.plantedCropId == null ? null : id(d.plantedCropId),
    cropName: text(d.cropName),
    plantedTime: time(d.plantedTime),
    harvestTime: time(d.harvestTime),
    lastWateredTime: time(d.lastWateredTime),
    nextWaterTime: time(d.nextWaterTime),
    dailyWaterCount: num(d.dailyWaterCount),
    unlockCost: d.unlockCost == null ? null : num(d.unlockCost),
    unlockLevel: d.unlockLevel == null ? null : num(d.unlockLevel),
    canSteal: d.canSteal === true,
  };
}
export function crop(v: unknown): Crop {
  const d = record(v);
  const icon = text(d.icon);
  return {
    id: id(d.id),
    name: text(d.name),
    category: text(d.category),
    icon:
      /^https?:\/\//.test(icon) ||
      /^\/(?!\/)/.test(icon) ||
      (icon.length <= 16 && !/[<>/:]/.test(icon))
        ? icon
        : '',
    price: num(d.price),
    coin: num(d.coin),
    experience: num(d.experience),
    growthTime: num(d.growthTime),
    unlockLevel: num(d.unlockLevel, 1),
    locked: d.locked === true,
  };
}
export function farmer(v: unknown): Farmer {
  const d = record(v);
  return {
    name: text(d.userName),
    avatar: image(d.userAvatar),
    level: num(d.level, 1),
    experience: num(d.experience),
    harvests: num(d.totalHarvest),
  };
}
export function friend(v: unknown): Friend {
  const d = record(v);
  return {
    id: id(d.friendId ?? d.systemUserId),
    name: text(d.nickname),
    avatar: image(d.avatar),
    cooldown: d.stealCooldown ? time(d.stealCooldown) : null,
    level: num(d.level, 1),
    canSteal: d.canSteal === true,
  };
}
export function visitor(v: unknown): Visitor {
  const d = record(v);
  return {
    id: id(d.id),
    name: text(d.stealerNickname),
    avatar: image(d.stealerAvatar),
    crop: text(d.cropName),
    coin: num(d.coinGained),
    time: text(d.stolenTime),
    read: d.isRead === 1,
  };
}
