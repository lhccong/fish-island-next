import type {
  PetCardCatalog,
  PetCardGrade,
  PetCardId,
  PetCardImage,
  PetCardStats,
} from './catalog';

export interface CollectedPetCard {
  id: PetCardId;
  name: string;
  grade: PetCardGrade;
  stars: number;
  art: PetCardImage;
}

export interface PetCardLevelProgress {
  level: number;
  completed: number;
  required: number;
}

export interface PetCardCollectionPort {
  collection(
    userId: string,
    page: number,
    signal: AbortSignal,
  ): Promise<{ items: CollectedPetCard[]; total: number; summary?: PetCardLevelProgress }>;
}

export interface PetCardOwned {
  cardId: PetCardId;
  stars: number;
  duplicates: number;
  showcased: boolean;
  upgradeCost: number | null;
}

export interface PetCardOpening {
  id: string;
  poolId: string;
  poolName: string;
  openedAt: string;
  cards: { cardId: PetCardId; name: string; duplicate: boolean; grade?: PetCardGrade }[];
}

export const petBatchPackLimit = 10;

export interface PetCardUpgradeTotals {
  upgradedCards: number;
  addedStars: number;
  spentDuplicates: number;
}

export type PetCardBatchResult =
  | { type: 'open'; openedPacks: number; newCards: number; duplicateCards: number }
  | ({ type: 'upgrade' } & PetCardUpgradeTotals);

export interface PetCardPlayState {
  day: string;
  freeRemaining: number;
  opened: number;
  level: number;
  xpToNext: number;
  balance: number;
  stock: { poolId: string; quantity: number; opened: number }[];
  collection: PetCardOwned[];
  pending: PetCardOpening | null;
  batch: PetCardBatchResult | null;
}

export type PetCardPlayAction =
  | { type: 'claim' | 'open'; poolId: string }
  | { type: 'openBatch'; poolId: string; quantity: number }
  | { type: 'buy'; poolId: string; unitPrice: number; quantity: 1 | 10 }
  | { type: 'finish'; openingId: string }
  | { type: 'upgrade'; cardId: string; stars: number }
  | { type: 'upgradeAll' }
  | { type: 'removeAll' }
  | { type: 'display' | 'remove'; cardId: string };

export interface PetCardHistoryPage {
  items: PetCardOpening[];
  nextCursor: string | null;
}

export interface PetCardPlayPort {
  catalog(signal: AbortSignal): Promise<PetCardCatalog>;
  state(signal: AbortSignal): Promise<PetCardPlayState>;
  submit(
    action: PetCardPlayAction,
    requestId: string,
    signal: AbortSignal,
  ): Promise<PetCardPlayState>;
  history(cursor: string | null, signal: AbortSignal): Promise<PetCardHistoryPage>;
}

export function petCardRequiredLevel(id: string) {
  return id === 'kingdoms' ? 10 : 1;
}

export function petCardBulkUpgradeQuote(collection: readonly PetCardOwned[]): PetCardUpgradeTotals {
  const totals = { upgradedCards: 0, addedStars: 0, spentDuplicates: 0 };
  for (const card of collection) {
    let next = card.upgradeCost;
    let stars = card.stars;
    let spent = 0;
    while (next && stars < 5 && card.duplicates - spent >= next) {
      spent += next;
      stars++;
      next *= 2;
    }
    if (stars > card.stars) {
      totals.upgradedCards++;
      totals.addedStars += stars - card.stars;
      totals.spentDuplicates += spent;
    }
  }
  return totals;
}

export function petCardStarStats<T extends PetCardStats>(stats: T, stars: number): T {
  return Object.fromEntries(
    Object.entries(stats).map(([stat, value]) => [
      stat,
      value > 0 ? value + (stars - 1) * Math.max(1, Math.floor(value / 5)) : value,
    ]),
  ) as T;
}
