import { afterEach, expect, it, vi } from 'vitest';
import { createBlacklistStorage } from './blacklist';
afterEach(() => vi.unstubAllGlobals());
it('isolates accounts, deduplicates IDs and only notifies after a successful write', () => {
  const storage = new Map<string, string>();
  const local = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
  };
  const window = new EventTarget();
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('window', window);
  const port = createBlacklistStorage();
  const listener = vi.fn();
  const stop = port.subscribe(listener);
  port.write('one', [
    { id: 'blocked', name: '合成用户' },
    { id: 'blocked', name: '合成用户' },
  ]);
  expect(port.read('one')).toHaveLength(1);
  expect(port.read('two')).toHaveLength(0);
  expect(port.read('one')).toBe(port.read('one'));
  local.setItem.mockImplementationOnce(() => {
    throw new Error('synthetic storage failure');
  });
  expect(() => port.write('one', [])).toThrow('storage failure');
  expect(port.read('one')).toHaveLength(1);
  expect(listener).toHaveBeenCalledOnce();
  stop();
  window.dispatchEvent(new Event('storage'));
  expect(listener).toHaveBeenCalledOnce();
});
