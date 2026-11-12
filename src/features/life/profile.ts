import type { ProfileState, Properties } from '@/domain/life';

export const profileKey = 'life-remake-profile';
export const freshProfile = (): ProfileState => ({
  times: 0,
  talents: new Set(),
  events: new Set(),
  achievements: new Set(),
});
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const numbers = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((item): item is number => Number.isSafeInteger(item) && item >= 0)
    : [];
function properties(value: unknown): Properties | undefined {
  if (!record(value)) return;
  const keys = ['age', 'charm', 'intelligence', 'strength', 'money', 'spirit'] as const;
  if (!keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))) return;
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as unknown as Properties;
}
export function readProfile(): { profile: ProfileState; notice: string } {
  try {
    const raw = localStorage.getItem(profileKey);
    if (!raw) return { profile: freshProfile(), notice: '' };
    const saved: unknown = JSON.parse(raw);
    if (
      !record(saved) ||
      typeof saved.times !== 'number' ||
      !Number.isSafeInteger(saved.times) ||
      saved.times < 0
    )
      throw new Error('Invalid profile');
    const profile: ProfileState = {
      times: saved.times,
      talents: new Set(numbers(saved.talents)),
      events: new Set(numbers(saved.events)),
      achievements: new Set(numbers(saved.achievements)),
    };
    if (Array.isArray(saved.locked)) profile.locked = numbers(saved.locked);
    const highest = properties(saved.highest),
      lowest = properties(saved.lowest);
    if (highest) profile.highest = highest;
    if (lowest) profile.lowest = lowest;
    if (record(saved.cultivation)) {
      const { times, bestRealm, bestAge } = saved.cultivation;
      if (
        [times, bestRealm, bestAge].every(
          (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0,
        ) &&
        Number(bestRealm) <= 13
      ) {
        profile.cultivation = {
          times: Number(times),
          bestRealm: Number(bestRealm),
          bestAge: Number(bestAge),
          events: numbers(saved.cultivation.events),
        };
      }
    }
    return { profile, notice: '' };
  } catch {
    return {
      profile: freshProfile(),
      notice: '本地存档无法读取，本次从新档开始；完成一局后可重新保存。',
    };
  }
}
export function saveProfile(profile: ProfileState): string {
  try {
    localStorage.setItem(
      profileKey,
      JSON.stringify({
        ...profile,
        talents: [...profile.talents],
        events: [...profile.events],
        achievements: [...profile.achievements],
      }),
    );
    return '';
  } catch {
    return '本地存档保存失败，本次仍可继续游玩；关闭页面后进度可能丢失。';
  }
}
