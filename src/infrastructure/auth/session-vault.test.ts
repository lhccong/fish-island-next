import { afterEach, expect, it, vi } from 'vitest';
import { createBrowserSessionVault } from './session-vault';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
  };
}
afterEach(() => vi.unstubAllGlobals());

it('isolates backend credentials and moves remember-login storage without retaining duplicates', () => {
  const localStorage = memoryStorage();
  const sessionStorage = memoryStorage();
  vi.stubGlobal('window', { localStorage, sessionStorage });
  const vault = createBrowserSessionVault('https://one.example.com');
  const other = createBrowserSessionVault('https://two.example.com');
  const token = { name: 'test-session', value: 'synthetic-test-value' };
  vault.write(token, false);
  expect(sessionStorage.length).toBe(1);
  expect(localStorage.length).toBe(0);
  expect(vault.read()).toEqual(token);
  expect(other.read()).toBeNull();
  vault.write(token, true);
  expect(localStorage.length).toBe(1);
  expect(sessionStorage.length).toBe(0);
  localStorage.setItem(localStorage.key(0)!, 'invalid-json');
  expect(vault.read()).toBeNull();
  expect(localStorage.length).toBe(0);
});
