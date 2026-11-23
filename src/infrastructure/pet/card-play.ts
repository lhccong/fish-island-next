import type { SessionToken } from '@/domain/auth';
import type {
  PetCardBatchResult,
  PetCardOpening,
  PetCardOwned,
  PetCardPlayPort,
  PetCardPlayState,
} from '@/domain/pet';
import { createPetCardCatalogLoader } from './card-catalog';
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

export function createPetCardPlay(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): PetCardPlayPort {
  const request = createPetRequest(baseUrl, token, onExpired);
  return {
    catalog: createPetCardCatalogLoader(baseUrl),
    async state(signal) {
      return state(await request('pet/cards/state', signal));
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
