import { defaultIsland, isIslandData, type IslandPreferencesPort } from '@/domain/my-island';

export function createIslandPreferences(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): IslandPreferencesPort {
  const key = (accountId: string) => `fish-island:my-island:v1:${encodeURIComponent(accountId)}`;
  return {
    read(accountId) {
      const raw = storage.getItem(key(accountId));
      if (raw === null) return defaultIsland();
      const parsed: unknown = JSON.parse(raw);
      if (!isIslandData(parsed)) throw new Error('Invalid island preferences');
      return parsed;
    },
    write(accountId, data) {
      if (!isIslandData(data)) throw new Error('Invalid island preferences');
      storage.setItem(key(accountId), JSON.stringify(data));
    },
  };
}
