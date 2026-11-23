import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { defaultPetCardWeights, petCardPacks, petCards } from '../../src/domain/pet';

const assets = [
  'card-art.jpg',
  'card-art-coral-reef.jpg',
  'card-art-mosswood.jpg',
  'card-art-snowbay.jpg',
  'card-art-sky-islands.jpg',
  'card-art-three-kingdoms-shu.jpg',
  'card-art-three-kingdoms-wei.jpg',
  'card-art-three-kingdoms-wu.jpg',
  'card-art-three-kingdoms-warlords.jpg',
  'card-art-three-kingdoms-taoyuan.jpg',
];
export const fixtureAtlases = assets.map((file, index) => ({
  file,
  id: `${createHash('sha256').update(file).digest('hex')}.jpg`,
  name: index === 0 ? '测试海岛十卡图集' : `测试图集 ${index + 1}`,
  portrait: [6, 8, 9].includes(index),
}));
export const fixturePools = Object.entries(petCardPacks).map(([id, pack], sortOrder) => ({
  id,
  name: pack.name,
  unitPrice: pack.unitPrice,
  coverId: pack.cover,
  weights: defaultPetCardWeights,
  sortOrder,
  version: 1,
}));
export const fixtureCards = Object.entries(petCards).map(([id, { art, ...card }]) => ({
  ...card,
  id,
  artKey: fixtureAtlases[Math.floor(art / 10)]!.id,
  artTile: art % 10,
  artPortrait: fixtureAtlases[Math.floor(art / 10)]!.portrait,
  sortOrder: art,
  version: 1,
  poolIds: fixturePools
    .filter((pool) => petCardPacks[pool.id as keyof typeof petCardPacks].ids.includes(id))
    .map(({ id }) => id),
}));

export async function setupPetCardCatalog(page: Page) {
  const requests: string[] = [];
  await page.route('**/api/pet/cards/catalog', (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: { code: 0, data: { cards: fixtureCards, pools: fixturePools } } });
  });
  await page.route('**/api/pet/cards/art/*', (route) => {
    const atlas = fixtureAtlases.find(({ id }) => route.request().url().endsWith(`/${id}`));
    return atlas
      ? route.fulfill({ path: `public/assets/pet/${atlas.file}`, contentType: 'image/jpeg' })
      : route.fulfill({ status: 404 });
  });
  return requests;
}
