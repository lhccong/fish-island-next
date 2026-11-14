import { describe, expect, it } from 'vitest';
import { isMature, watering, type Land } from './index';
const now = new Date(2026, 10, 14, 12).getTime();
const land: Land = {
  id: '1',
  index: 1,
  locked: false,
  status: 1,
  cropId: '2',
  cropName: '萝卜',
  plantedTime: now - 1000,
  harvestTime: now + 3600000,
  lastWateredTime: null,
  nextWaterTime: null,
  dailyWaterCount: 0,
  unlockCost: null,
  unlockLevel: null,
  canSteal: false,
};
describe('农场成熟与浇水边界', () => {
  it('成熟时刻、锁地和服务端成熟状态', () => {
    expect(isMature(land, now)).toBe(false);
    expect(isMature({ ...land, harvestTime: now }, now)).toBe(true);
    expect(isMature({ ...land, locked: true, status: 2 }, now)).toBe(false);
    expect(isMature({ ...land, status: 2 }, now)).toBe(true);
  });
  it('冷却、每日上限和跨日恢复', () => {
    expect(watering(land, now).allowed).toBe(true);
    expect(watering({ ...land, lastWateredTime: now - 1799999 }, now).allowed).toBe(false);
    expect(watering({ ...land, lastWateredTime: now - 1800000 }, now).allowed).toBe(true);
    expect(watering({ ...land, dailyWaterCount: 10 }, now).allowed).toBe(false);
    expect(
      watering({ ...land, dailyWaterCount: 10, lastWateredTime: now - 86400000 }, now).allowed,
    ).toBe(true);
    expect(watering({ ...land, nextWaterTime: now + 10000 }, now).wait).toBe(10000);
    expect(watering({ ...land, harvestTime: null }, now).allowed).toBe(false);
  });
});
