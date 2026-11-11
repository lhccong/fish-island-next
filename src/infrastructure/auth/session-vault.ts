import type { SessionVault } from '@/domain/auth';
import { decodeToken } from './decode';

export function createBrowserSessionVault(baseUrl: string): SessionVault {
  const key = `fish-island-next.session:${encodeURIComponent(baseUrl.replace(/\/+$/, ''))}`;
  return {
    read() {
      const raw = window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
      if (!raw) return null;
      try {
        return decodeToken(JSON.parse(raw) as unknown);
      } catch {
        this.clear();
        return null;
      }
    },
    write(token, remember) {
      const target = remember ? window.localStorage : window.sessionStorage;
      const other = remember ? window.sessionStorage : window.localStorage;
      target.setItem(key, JSON.stringify(token));
      other.removeItem(key);
    },
    clear() {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
    subscribe(listener) {
      const handler = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  };
}
