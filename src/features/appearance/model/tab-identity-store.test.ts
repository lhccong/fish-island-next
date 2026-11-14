import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

test('restores valid preferences and rejects unsafe or corrupt configuration', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => JSON.stringify({ name: ' 工作台 ', icon: 'https://example.com/icon.png' }),
  });
  const { useTabIdentityStore, normalizeTabIdentity } = await import('./tab-identity-store');
  expect(useTabIdentityStore.getState().identity.name).toBe('工作台');
  for (const icon of [
    'javascript:alert(1)',
    'http://example.com/a.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'https://user:pass@example.com/a.png',
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

test('storage failure preserves applied identity and retry saves only tab preferences', async () => {
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
    useTabIdentityStore: store,
    defaultTabIdentity,
    tabIdentityStorageKey,
  } = await import('./tab-identity-store');
  expect(store.getState().identity).toEqual(defaultTabIdentity);
  const identity = { name: '文档', icon: 'https://example.com/icon.png' };
  expect(() => store.getState().save(identity)).toThrow('本地保存失败');
  expect(store.getState().identity).toEqual(defaultTabIdentity);
  fail = false;
  store.getState().save(identity);
  expect(store.getState().identity).toEqual(identity);
  expect([...entries.keys()]).toEqual([tabIdentityStorageKey]);
  store.getState().save(defaultTabIdentity);
  expect(store.getState().identity).toEqual(defaultTabIdentity);
});
