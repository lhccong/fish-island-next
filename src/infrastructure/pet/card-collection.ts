import type { Table } from 'dexie';
import {
  demoPetCardCatalog,
  petCardsDay,
  restorePetCardsProgress,
  updatePetCards,
  type LegacyPetCardsProgress,
  type PetCardsPort,
  type PetCardsProgress,
} from '@/domain/pet';

type SavedProgress = { id: string; progress: PetCardsProgress | LegacyPetCardsProgress };

export function createBrowserPetCards(
  scope: string,
  loadCatalog: PetCardsPort['catalog'] = () => Promise.resolve(demoPetCardCatalog),
): PetCardsPort {
  let connection: ReturnType<typeof connect> | undefined;
  const collection = () => (connection ??= connect());

  function key(userId: string) {
    return JSON.stringify([scope, userId]);
  }

  return {
    catalog: loadCatalog,
    watch(userId, receive, fail) {
      let active = true;
      let unsubscribe: (() => void) | undefined;
      void collection().then(
        ({ albums, liveQuery }) => {
          if (!active) return;
          const subscription = liveQuery(async () => {
            const saved = await albums.get(key(userId));
            return restorePetCardsProgress(saved?.progress);
          }).subscribe({
            next: receive,
            error: () => {
              if (active) {
                albums.db.close();
                connection = undefined;
                fail();
              }
            },
          });
          unsubscribe = () => subscription.unsubscribe();
        },
        () => {
          connection = undefined;
          if (active) fail();
        },
      );
      return () => {
        active = false;
        unsubscribe?.();
      };
    },
    async update(userId, action, catalog) {
      const { albums } = await collection();
      const id = key(userId);
      return albums.db.transaction('rw', albums, async () => {
        const saved = await albums.get(id);
        const progress = updatePetCards(
          restorePetCardsProgress(saved?.progress),
          action,
          petCardsDay(),
          Math.random,
          catalog,
        );
        await albums.put({ id, progress });
        return progress;
      });
    },
  };
}

async function connect() {
  const { default: Dexie, liveQuery } = await import('dexie');
  const database = new Dexie('fish-island-pet-cards');
  database.version(1).stores({ albums: 'id' });
  // Close pre-inventory clients before the new format is written.
  database.version(2).stores({ albums: 'id' });
  const albums: Table<SavedProgress, string> = database.table('albums');
  return { albums, liveQuery };
}
