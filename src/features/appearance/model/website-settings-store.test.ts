import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

test('restores valid preferences and rejects unsafe or corrupt configuration', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => JSON.stringify({ name: ' 工作台 ', icon: 'https://example.com/icon.png' }),
  });
  const { useWebsiteSettingsStore, normalizeTabIdentity } =
    await import('./website-settings-store');
  expect(useWebsiteSettingsStore.getState().identity.name).toBe('工作台');
  expect(useWebsiteSettingsStore.getState().fontScale).toBe('100');
  expect(normalizeTabIdentity({ name: ' 搜索 ', icon: '/tab-icons/baidu.ico' })).toEqual({
    name: '搜索',
    icon: '/tab-icons/baidu.ico',
  });
  for (const icon of [
    'javascript:alert(1)',
    'http://example.com/a.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'https://user:pass@example.com/a.png',
    '/tab-icons/unrecognized.ico',
  ]) {
    expect(normalizeTabIdentity({ name: '名称', icon })).toBeNull();
  }
  expect(
    normalizeTabIdentity({ name: ' '.repeat(5), icon: 'https://example.com/a.png' }),
  ).toBeNull();
  expect(
    normalizeTabIdentity({ name: '名'.repeat(61), icon: 'https://example.com/a.png' }),
  ).toBeNull();
});

test('storage failure preserves applied preferences and retry saves them together', async () => {
  let fail = true;
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: () => '{broken',
    setItem: (key: string, value: string) => {
      if (fail) throw new Error('quota');
      entries.set(key, value);
    },
  });
  const {
    useWebsiteSettingsStore: store,
    defaultTabIdentity,
    tabIdentityStorageKey,
  } = await import('./website-settings-store');
  expect(store.getState().identity).toEqual(defaultTabIdentity);
  const identity = { name: '文档', icon: 'https://example.com/icon.png' };
  expect(() => store.getState().save(identity, '120')).toThrow('本地保存失败');
  expect(store.getState().identity).toEqual(defaultTabIdentity);
  expect(store.getState().fontScale).toBe('100');
  fail = false;
  store.getState().save(identity, '120');
  expect(store.getState().identity).toEqual(identity);
  expect(store.getState().fontScale).toBe('120');
  expect([...entries.entries()]).toEqual([
    [tabIdentityStorageKey, JSON.stringify({ ...identity, fontScale: '120' })],
  ]);
  const appliedIdentity = store.getState().identity;
  store.getState().save(identity, '110');
  expect(store.getState().identity).toBe(appliedIdentity);
  store.getState().save(defaultTabIdentity, '100');
  expect(store.getState().identity).toEqual(defaultTabIdentity);
  expect(store.getState().fontScale).toBe('100');
});

test.each([
  ['90', '90'],
  ['110', '110'],
  ['120', '120'],
  [120, '100'],
  ['150', '100'],
])('restores saved font scale %s as %s', async (fontScale, expected) => {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ fontScale }) });
  const { useWebsiteSettingsStore } = await import('./website-settings-store');
  expect(useWebsiteSettingsStore.getState().fontScale).toBe(expected);
});
