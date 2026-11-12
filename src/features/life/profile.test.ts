import { afterEach, expect, test, vi } from 'vitest';
import { freshProfile, profileKey, readProfile, saveProfile } from './profile';

afterEach(() => vi.unstubAllGlobals());
test('original profile round trips sets, inherited talent and cultivation statistics', () => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  const profile = {
    ...freshProfile(),
    times: 10,
    talents: new Set([1001]),
    achievements: new Set([228]),
    locked: [1001],
    cultivation: { times: 2, bestRealm: 4, bestAge: 300, events: [910000] },
  };
  expect(saveProfile(profile)).toBe('');
  expect(data.has(profileKey)).toBe(true);
  expect(readProfile()).toEqual({ profile, notice: '' });
});
test('corrupt and inaccessible storage return a playable fresh profile', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => '{invalid',
    setItem: () => {
      throw new Error('Quota');
    },
  });
  const result = readProfile();
  expect(result.profile).toEqual(freshProfile());
  expect(result.notice).toContain('无法读取');
  expect(saveProfile(result.profile)).toContain('保存失败');
});
