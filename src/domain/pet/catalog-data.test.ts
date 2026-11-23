import { describe, expect, it } from 'vitest';
import {
  petCards,
  emptyPetCards,
  getPetCard,
  restorePetCardsProgress,
  summarizePetShowcase,
  updatePetCards,
} from './cards';
import { defaultPetCardWeights } from './catalog';
import { readPetCardCatalog, readPetCardPage } from './catalog-data';

const artKey = `${'a'.repeat(64)}.jpg`;
const definition = {
  id: 'radish',
  name: '已配置的萝卜',
  grade: 'common',
  stats: { health: 42, attack: 7 },
  battle: petCards.radish.battle,
  artKey,
  artTile: 9,
  artPortrait: false,
  sortOrder: 0,
  version: 2,
  poolIds: ['island', 'expansion'],
};
const pool = {
  id: 'island',
  name: '海岛配置',
  version: 1,
  sortOrder: 0,
  coverId: 'radish',
  weights: defaultPetCardWeights,
};
const imageUrl = (key: string) => `/api/pet/cards/art/${key}`;

describe('server pet card catalog', () => {
  it('uses server stats, slot and shared membership when opening a saved or new pack', () => {
    const catalog = readPetCardCatalog(
      {
        cards: [definition],
        pools: [pool, { ...pool, id: 'expansion' }, { ...pool, id: 'empty' }],
      },
      imageUrl,
    );
    expect(catalog.packIds).toEqual(['island', 'expansion']);
    expect(getPetCard('radish', catalog)).toMatchObject({
      name: definition.name,
      art: { tile: 9, url: imageUrl(artKey) },
    });
    expect(summarizePetShowcase(['radish'], catalog)).toEqual(definition.stats);
    const saved = restorePetCardsProgress({
      day: '',
      claimed: 1,
      sealed: true,
      opened: 0,
      result: null,
      owned: [],
      showcased: [],
      points: 0,
    });
    expect(
      updatePetCards(
        saved,
        { type: 'open', packId: 1, pack: 'island' },
        'test',
        () => 0.99,
        catalog,
      ).owned,
    ).toEqual(['radish']);
    const claimed = updatePetCards(
      emptyPetCards(),
      { type: 'claim', pack: 'expansion' },
      'test',
      Math.random,
      catalog,
    );
    expect(claimed.pack).toBe('expansion');
  });

  it('rejects untrusted image keys and invalid battle layouts', () => {
    expect(() =>
      readPetCardCatalog(
        { cards: [{ ...definition, artKey: '../img.jpg' }], pools: [pool] },
        imageUrl,
      ),
    ).toThrow();
    expect(() =>
      readPetCardCatalog(
        { cards: [{ ...definition, battle: petCards.fox.battle }], pools: [pool] },
        imageUrl,
      ),
    ).toThrow();
  });
});

describe('admin pet card pagination', () => {
  it.each([100, '100'])('decodes a page with total %j', (total) => {
    expect(readPetCardPage({ items: [definition], total })).toEqual({
      items: [definition],
      total: 100,
    });
  });

  it('decodes an empty page with a string total', () => {
    expect(readPetCardPage({ items: [], total: '0' })).toEqual({ items: [], total: 0 });
  });

  it.each(['', '-1', '1.5', '1e2', '9007199254740992'])('rejects invalid total %j', (total) => {
    expect(() => readPetCardPage({ items: [], total })).toThrow('卡池数据异常');
  });
});
