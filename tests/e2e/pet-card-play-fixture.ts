import { expect, type Page } from '@playwright/test';
import {
  petCardsDay,
  type PetCardOpening,
  type PetCardPlayAction,
  type PetCardPlayState,
} from '../../src/domain/pet';

export async function setupPetCardPlay(
  page: Page,
  initial: Partial<
    Pick<PetCardPlayState, 'opened' | 'level' | 'xpToNext' | 'stock' | 'collection'>
  > = {},
) {
  const state: PetCardPlayState = {
    day: petCardsDay(),
    freeRemaining: 2,
    opened: 39,
    level: 9,
    xpToNext: 1,
    balance: 1600,
    stock: [],
    collection: [],
    pending: null,
    batch: null,
    ...initial,
  };
  let stateFails = true;
  let releaseState!: () => void;
  const initialState = new Promise<void>((resolve) => {
    releaseState = resolve;
  });
  let historyFails = true;
  let bulkFails = true;
  let batchFails = true;
  let hasBatchHistory = false;
  const requestIds: string[] = [];
  const batchIds: string[] = [];
  const historyRequests: string[] = [];
  const openings: PetCardOpening[] = [];
  await page.route('**/api/pet/cards/state', async (route) => {
    if (stateFails) {
      stateFails = false;
      await initialState;
      return route.fulfill({ status: 503 });
    }
    return route.fulfill({ json: { code: 0, data: { ...state, batch: null } } });
  });
  await page.route('**/api/pet/cards/history*', (route) => {
    if (historyFails) {
      historyFails = false;
      return route.fulfill({ status: 503 });
    }
    const before = new URL(route.request().url()).searchParams.get('before') ?? '';
    historyRequests.push(before);
    if (hasBatchHistory) {
      return route.fulfill({
        json: { code: 0, data: { items: [...openings].reverse(), nextCursor: null } },
      });
    }
    if (openings.length && before) {
      const items = [{ ...openings[0], id: '1', poolName: '海岛篇旧记录' }];
      return route.fulfill({ json: { code: 0, data: { items, nextCursor: null } } });
    }
    const items = openings.length
      ? Array.from({ length: 20 }, (_, index) => ({
          ...openings[0],
          id: String(22 - index),
        }))
      : [];
    return route.fulfill({
      json: { code: 0, data: { items, nextCursor: items.length ? '3' : null } },
    });
  });
  await page.route('**/api/pet/cards/actions', (route) => {
    const request = route.request();
    expect(request.headers()['synthetic-session']).toBe('synthetic-value');
    const action = request.postDataJSON() as PetCardPlayAction & { requestId: string };
    state.batch = null;
    if ('poolId' in action) {
      const pool = state.stock.find((entry) => entry.poolId === action.poolId) ?? {
        poolId: action.poolId,
        quantity: 0,
        opened: 0,
      };
      if (!state.stock.includes(pool)) state.stock.push(pool);
      if (action.type === 'claim') {
        expect(action.poolId).toBe('island');
        state.freeRemaining--;
        pool.quantity++;
      } else if (action.type === 'buy') {
        expect(action.unitPrice).toBe(action.poolId === 'island' ? 50 : 100);
        if (action.quantity === 10) {
          requestIds.push(action.requestId);
          if (bulkFails) {
            bulkFails = false;
            return route.fulfill({ status: 503 });
          }
        }
        pool.quantity += action.quantity;
        state.balance -= action.unitPrice * (action.quantity === 10 ? 9 : 1);
      } else if (action.type === 'openBatch') {
        batchIds.push(action.requestId);
        if (batchFails) {
          batchFails = false;
          return route.fulfill({ status: 503 });
        }
        expect(action.quantity).toBeGreaterThanOrEqual(2);
        expect(action.quantity).toBeLessThanOrEqual(Math.min(10, pool.quantity));
        pool.quantity -= action.quantity;
        pool.opened += action.quantity;
        state.opened += action.quantity;
        state.xpToNext -= action.quantity;
        hasBatchHistory = true;
        let newCards = 0;
        for (let pack = 0; pack < action.quantity; pack++) {
          const cards = ['radish', 'radish', 'radish', 'crab', 'radish'].map((cardId) => {
            const name = cardId === 'radish' ? '拾贝萝卜' : '潮汐小蟹';
            const card = state.collection.find((entry) => entry.cardId === cardId);
            if (card) card.duplicates++;
            else {
              newCards++;
              state.collection.push({
                cardId,
                stars: 1,
                duplicates: 0,
                showcased: false,
                upgradeCost: 1,
              });
            }
            return { cardId, name, duplicate: !!card };
          });
          openings.push({
            id: String(openings.length + 100),
            poolId: pool.poolId,
            poolName: '海岛初遇',
            openedAt: '2026-11-23T10:00:00Z',
            cards,
          });
        }
        state.batch = {
          type: 'open',
          openedPacks: action.quantity,
          newCards,
          duplicateCards: action.quantity * 5 - newCards,
        };
      } else {
        pool.quantity--;
        pool.opened++;
        state.opened++;
        state.level = state.opened >= 2307 ? 60 : 10;
        state.xpToNext = state.level === 60 ? 0 : 6;
        state.pending = {
          id: '22',
          poolId: 'island',
          poolName: '海岛初遇',
          openedAt: '2026-11-23T10:00:00Z',
          cards: [
            ...Array.from({ length: 4 }, (_, i) => ({
              cardId: 'radish',
              name: '拾贝萝卜',
              duplicate: i > 0,
            })),
            { cardId: 'fox', name: '极光灵狐', duplicate: false },
          ],
        };
        state.collection = [
          { cardId: 'radish', stars: 1, duplicates: 3, showcased: true, upgradeCost: 1 },
          { cardId: 'fox', stars: 1, duplicates: 0, showcased: false, upgradeCost: 1 },
        ];
        openings.push(state.pending);
      }
    } else if (action.type === 'upgradeAll') {
      const result = {
        type: 'upgrade' as const,
        upgradedCards: 0,
        addedStars: 0,
        spentDuplicates: 0,
      };
      for (const card of state.collection) {
        const before = card.stars;
        while (card.upgradeCost !== null && card.duplicates >= card.upgradeCost) {
          card.stars++;
          card.duplicates -= card.upgradeCost;
          result.spentDuplicates += card.upgradeCost;
          card.upgradeCost = card.stars === 5 ? null : 2 ** (card.stars - 1);
        }
        result.upgradedCards += Number(card.stars > before);
        result.addedStars += card.stars - before;
      }
      state.batch = result;
    } else if (action.type === 'finish') {
      expect(action.openingId).toBe(state.pending?.id);
      state.pending = null;
    } else if (action.type === 'upgrade') {
      const card = state.collection.find(({ cardId }) => cardId === action.cardId)!;
      expect(action.stars).toBe(card.stars);
      card.duplicates -= card.upgradeCost!;
      card.stars++;
      card.upgradeCost = 2 ** (card.stars - 1);
    } else {
      const card = state.collection.find(({ cardId }) => cardId === action.cardId)!;
      card.showcased = action.type === 'display';
    }
    return route.fulfill({ json: { code: 0, data: state } });
  });
  function prepareLastLevel() {
    state.opened = 2306;
    state.level = 59;
    state.xpToNext = 1;
  }
  return { requestIds, batchIds, historyRequests, releaseState, prepareLastLevel };
}
