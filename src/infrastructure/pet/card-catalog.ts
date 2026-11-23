import { readPetCardCatalog } from '@/domain/pet';

export function createPetCardCatalogLoader(baseUrl: string) {
  const api = `${baseUrl.replace(/\/+$/, '')}/api/pet/cards`;
  return async (signal: AbortSignal) => {
    const response = await fetch(`${api}/catalog`, {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) throw new Error('暂时无法读取卡池，请重试。');
    const payload: { code?: unknown; data?: unknown } | null = await response.json();
    if (!payload || payload.code !== 0) throw new Error('暂时无法读取卡池，请重试。');
    return readPetCardCatalog(payload.data, (key) => `${api}/art/${encodeURIComponent(key)}`);
  };
}
