import { afterEach, expect, it, vi } from 'vitest';
import { createLocalChatPreferences } from './preferences';

afterEach(() => vi.unstubAllGlobals());

it('persists frame visibility independently from avatar visibility and image loading', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  const preferences = createLocalChatPreferences();
  expect(preferences.readHideAvatarFrames()).toBe(false);
  preferences.writeHideAvatarFrames(true);
  expect(createLocalChatPreferences().readHideAvatarFrames()).toBe(true);
  expect(preferences.readShowAvatars()).toBe(true);
  expect(preferences.readDeferImages()).toBe(false);
  preferences.writeShowAvatars(false);
  expect(preferences.readHideAvatarFrames()).toBe(true);
  preferences.writeHideAvatarFrames(false);
  expect(preferences.readHideAvatarFrames()).toBe(false);
  expect(preferences.readShowAvatars()).toBe(false);
});
