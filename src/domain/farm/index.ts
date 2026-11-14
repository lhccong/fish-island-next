export interface Crop {
  id: string;
  name: string;
  category: string;
  icon: string;
  price: number;
  coin: number;
  experience: number;
  growthTime: number;
  unlockLevel: number;
  locked: boolean;
}
export interface Land {
  id: string;
  index: number;
  locked: boolean;
  status: number;
  cropId: string | null;
  cropName: string;
  plantedTime: number | null;
  harvestTime: number | null;
  lastWateredTime: number | null;
  nextWaterTime: number | null;
  dailyWaterCount: number;
  unlockCost: number | null;
  unlockLevel: number | null;
  canSteal: boolean;
}
export interface Farmer {
  name: string;
  avatar: string;
  level: number;
  experience: number;
  harvests: number;
}
export interface Friend {
  id: string;
  name: string;
  avatar: string;
  cooldown: number | null;
  level: number;
  canSteal: boolean;
}
export interface Visitor {
  id: string;
  name: string;
  avatar: string;
  crop: string;
  coin: number;
  time: string;
  read: boolean;
}
export type FarmAction = 'plant' | 'harvest' | 'water' | 'waterBatch' | 'unlock' | 'steal';
export interface FarmPort {
  lands(friendId: string | null, signal: AbortSignal): Promise<Land[]>;
  crops(signal: AbortSignal): Promise<Crop[]>;
  farmer(signal: AbortSignal): Promise<Farmer>;
  balance(signal: AbortSignal): Promise<number>;
  friends(signal: AbortSignal): Promise<Friend[]>;
  visitors(signal: AbortSignal): Promise<Visitor[]>;
  readVisitors(signal: AbortSignal): Promise<void>;
  act(
    action: FarmAction,
    ids: string[],
    cropId: string | null,
    signal: AbortSignal,
  ): Promise<string>;
}
export function isMature(land: Land, now: number) {
  return (
    !land.locked &&
    (land.status === 2 ||
      (land.status === 1 && land.harvestTime !== null && land.harvestTime <= now))
  );
}
export function watering(land: Land, now: number) {
  const last = land.lastWateredTime;
  const used =
    last !== null && new Date(last).toDateString() !== new Date(now).toDateString()
      ? 0
      : land.dailyWaterCount;
  const remaining = Math.max(0, 10 - used);
  const wait = Math.max(
    0,
    (last === null ? 0 : last + 1800000) - now,
    (land.nextWaterTime ?? 0) - now,
  );
  return {
    remaining,
    wait,
    allowed:
      !land.locked &&
      land.status === 1 &&
      !isMature(land, now) &&
      land.harvestTime !== null &&
      remaining > 0 &&
      wait === 0,
  };
}
export function remainingTime(end: number | null, now: number) {
  if (end === null) return '生长时间待同步';
  const minutes = Math.max(0, Math.ceil((end - now) / 60000));
  if (!minutes) return '等待成熟确认';
  return minutes >= 60 ? `${Math.floor(minutes / 60)}时${minutes % 60}分` : `${minutes}分钟`;
}
