import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

test('restores skin and mode independently and persists changes separately', async () => {
  const entries = new Map([
    ['fish-island:skin', 'wps'],
    ['fish-island:color-mode', 'dark'],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  const { useAppearanceStore: store } = await import('./appearance-store');
  expect(store.getState()).toMatchObject({ skinId: 'wps', colorMode: 'dark' });
  store.getState().setSkinId('wecom');
  expect(store.getState()).toMatchObject({ skinId: 'wecom', colorMode: 'dark' });
  store.getState().setColorMode('light');
  expect(store.getState()).toMatchObject({ skinId: 'wecom', colorMode: 'light' });
  expect(entries.get('fish-island:skin')).toBe('wecom');
  expect(entries.get('fish-island:color-mode')).toBe('light');
});

test('storage failures leave both appearance controls usable', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('Unavailable');
    },
    setItem: () => {
      throw new Error('Unavailable');
    },
  });
  const { useAppearanceStore: store } = await import('./appearance-store');
  expect(store.getState()).toMatchObject({ skinId: 'wechat', colorMode: 'light' });
  store.getState().setColorMode('dark');
  store.getState().setSkinId('feishu');
  expect(store.getState()).toMatchObject({ skinId: 'feishu', colorMode: 'dark' });
});

test('unknown saved mode falls back to light without changing the selected skin', async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key.endsWith(':skin') ? 'dingtalk' : 'unknown'),
  });
  const { useAppearanceStore: store } = await import('./appearance-store');
  expect(store.getState()).toMatchObject({ skinId: 'dingtalk', colorMode: 'light' });
});
