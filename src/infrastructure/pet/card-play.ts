import type { SessionToken } from '@/domain/auth';
import type {
  PetCardCollectionPort,
  PetCardBatchResult,
  PetCardLevelProgress,
  PetCardOpening,
  PetCardOwned,
  PetCardPlayPort,
  PetCardPlayState,
} from '@/domain/pet';
import { petCardGradeIds } from '@/domain/pet';
import { createPetCardCatalogLoader, petCardArtUrl } from './card-catalog';
import { id, list, number, record, text } from './decode';
import { createPetRequest } from './request';

function opening(value: unknown): PetCardOpening {
  const data = record(value);
  return {
    id: id(data.id),
    poolId: text(data.poolId),
    poolName: text(data.poolName),
    openedAt: text(data.openedAt),
    cards: list(data.cards, (item) => {
      const pull = record(item);
      return {
        cardId: text(pull.cardId),
        name: text(pull.name),
        duplicate: pull.duplicate === true,
      };
    }),
  };
}

function owned(value: unknown): PetCardOwned {
  const card = record(value);
  return {
    cardId: text(card.cardId),
    stars: number(card.stars),
    duplicates: number(card.duplicates),
    showcased: card.showcased === true,
    upgradeCost: card.upgradeCost == null ? null : number(card.upgradeCost),
  };
}

function batch(value: unknown): PetCardBatchResult | null {
  if (value == null) return null;
  const result = record(value);
  const openedPacks = number(result.openedPacks);
  if (openedPacks > 0) {
    return {
      type: 'open',
      openedPacks,
      newCards: number(result.newCards),
      duplicateCards: number(result.duplicateCards),
    };
  }
  return {
    type: 'upgrade',
    upgradedCards: number(result.upgradedCards),
    addedStars: number(result.addedStars),
    spentDuplicates: number(result.spentDuplicates),
  };
}

function state(value: unknown): PetCardPlayState {
  const data = record(value);
  return {
    day: text(data.day),
    freeRemaining: number(data.freeRemaining),
    opened: number(data.opened),
    level: number(data.level),
    xpToNext: number(data.xpToNext),
    balance: number(data.balance),
    stock: list(data.stock, (entry) => {
      const stock = record(entry);
      return {
        poolId: text(stock.poolId),
        quantity: number(stock.quantity),
        opened: number(stock.opened),
      };
    }),
    collection: list(data.collection, owned),
    pending: data.pending == null ? null : opening(data.pending),
    batch: batch(data.batch),
  };
}

function levelProgress(value: unknown): PetCardLevelProgress | null {
  if (value == null) return null;
  const data = record(value);
  const level = number(data.level, -1);
  const completed = number(data.completed, -1);
  const required = number(data.required, -1);
  if (
    ![level, completed, required].every(Number.isSafeInteger) ||
    level < 1 ||
    completed < 0 ||
    required < 0 ||
    (required === 0 ? completed !== 0 : completed >= required)
  )
    throw new Error('抽卡等级进度数据无效');
  return { level, completed, required };
}

export function createPetCardPlay(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): PetCardPlayPort & PetCardCollectionPort {
  const request = createPetRequest(baseUrl, token, onExpired);
  return {
    catalog: createPetCardCatalogLoader(baseUrl),
    async state(signal) {
      return state(await request('pet/cards/state', signal));
    },
    async collection(userId, page, signal) {
      const query = new URLSearchParams({ userId, page: String(page) });
      const data = record(await request(`pet/cards/collection?${query}`, signal));
      const total = number(data.total, -1);
      if (!Number.isSafeInteger(total) || total < 0) throw new Error('卡片收藏总数无效');
      const items = list(data.items, (item) => {
        const card = record(item);
        const id = text(card.id);
        const name = text(card.name);
        const grade = petCardGradeIds.find((grade) => grade === card.grade);
        const key = text(card.artKey);
        const tile = number(card.artTile, -1);
        const stars = number(card.stars);
        if (
          !id ||
          !name ||
          !grade ||
          !/^[a-f0-9]{64}\.(jpg|png)$/.test(key) ||
          !Number.isInteger(tile) ||
          tile < 0 ||
          tile > 9 ||
          !Number.isInteger(stars) ||
          stars < 1 ||
          stars > 5 ||
          typeof card.portrait !== 'boolean'
        )
          throw new Error('卡片收藏数据格式异常');
        return {
          id,
          name,
          grade,
          stars,
          art: { url: petCardArtUrl(baseUrl, key), tile, portrait: card.portrait },
        };
      });
      const progress = levelProgress(data.progress);
      return { items, total, ...(progress && { summary: progress }) };
    },
    async submit(action, requestId, signal) {
      return state(await request('pet/cards/actions', signal, { ...action, requestId }));
    },
    async history(cursor, signal) {
      const query = cursor ? '?' + new URLSearchParams({ before: cursor }) : '';
      const data = record(await request('pet/cards/history' + query, signal));
      return {
        items: list(data.items, opening),
        nextCursor: data.nextCursor == null ? null : id(data.nextCursor),
      };
    },
  };
}
