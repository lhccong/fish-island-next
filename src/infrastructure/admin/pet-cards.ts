import type { AdminPetCardPort } from '@/domain/admin';
import {
  readPetCardAtlas,
  readPetCardAtlases,
  readPetCardPage,
  readPetCardPools,
} from '@/domain/pet';

type Request = (
  path: string,
  signal: AbortSignal,
  body?: object,
  method?: string,
) => Promise<unknown>;

export function createAdminPetCards(request: Request, baseUrl: string): AdminPetCardPort {
  const path = 'admin/pet-cards';
  const imageUrl = (key: string) =>
    `${baseUrl.replace(/\/+$/, '')}/api/pet/cards/art/${encodeURIComponent(key)}`;
  async function save(resource: string, value: object, signal: AbortSignal) {
    if ((await request(`${path}/${resource}`, signal, value)) !== true)
      throw new Error('服务器未确认保存，请刷新核对。');
  }
  return {
    async pools(signal) {
      return readPetCardPools(await request(`${path}/pools`, signal, undefined, 'GET'));
    },
    async atlases(signal) {
      return readPetCardAtlases(
        await request(`${path}/atlases`, signal, undefined, 'GET'),
        imageUrl,
      );
    },
    async cards(page, pool, query, signal) {
      const params = new URLSearchParams({ page: String(page), query });
      if (pool) params.set('poolId', pool);
      return readPetCardPage(await request(`${path}/cards?${params}`, signal, undefined, 'GET'));
    },
    savePool: (value, signal) => save('pools', value, signal),
    saveCard: (value, signal) => save('cards', value, signal),
    async uploadAtlas({ name, portrait, file }, signal) {
      const body = new FormData();
      body.set('name', name);
      body.set('portrait', String(portrait));
      body.set('file', file);
      return readPetCardAtlas(await request(`${path}/atlases`, signal, body), imageUrl);
    },
  };
}
