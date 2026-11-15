import { expect, test } from 'vitest';
import { defaultIsland, isIslandData, safeIslandHref } from '@/domain/my-island';
import { createIslandPreferences } from './index';

test('isolates accounts and validates persisted content without overwriting invalid data', () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  const port = createIslandPreferences(storage);
  port.write('a', { ...defaultIsland(), note: 'private synthetic note' });
  expect(port.read('a').note).toBe('private synthetic note');
  expect(port.read('b').note).toBe('');
  expect(() =>
    port.write('a', {
      ...defaultIsland(),
      shortcuts: [{ id: 'bad', label: 'bad', href: 'javascript:alert(1)' }],
    }),
  ).toThrow();
  expect(port.read('a').note).toBe('private synthetic note');
  entries.set('fish-island:my-island:v1:a', 'broken');
  expect(() => port.read('a')).toThrow();
  expect(entries.get('fish-island:my-island:v1:a')).toBe('broken');
});
test('bounds personal content and rejects unsafe shortcut protocols and duplicate IDs', () => {
  for (const href of [
    'javascript:alert(1)',
    'data:text/html,test',
    '//evil.test',
    '/\\evil',
    '/\n/evil',
    'https://example.com/with space',
  ])
    expect(safeIslandHref(href)).toBe(false);
  for (const href of ['/pet', 'https://example.com', 'http://example.com/path?q=1'])
    expect(safeIslandHref(href)).toBe(true);
  expect(isIslandData({ ...defaultIsland(), note: 'x'.repeat(5001) })).toBe(false);
  expect(
    isIslandData({
      ...defaultIsland(),
      modules: [
        { id: 'note', visible: true },
        { id: 'note', visible: false },
        { id: 'dock', visible: true },
      ],
    }),
  ).toBe(false);
});
