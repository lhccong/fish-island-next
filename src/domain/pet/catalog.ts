import type { PetCardBattleAction, PetCardBattleEffect } from './card-battle';
import type { PetCardBond } from './card-bonds';

export const petCardGrades = {
  common: { name: '普通', weight: 46, points: 5 },
  fine: { name: '精良', weight: 28, points: 10 },
  epic: { name: '史诗', weight: 16, points: 20 },
  legendary: { name: '传说', weight: 8, points: 40 },
  shiny: { name: '闪耀', weight: 2, points: 80 },
} as const;

export const petCardStatLabels = { attack: '攻击', defense: '防御', health: '生命', speed: '速度' };
export type PetCardGrade = keyof typeof petCardGrades;
export type PetCardStat = keyof typeof petCardStatLabels;
export type PetCardStats = Partial<Record<PetCardStat, number>>;
export type PetCardId = string;
export type PetCardPackKind = string;

export type PetCardImage = { url: string; tile: number; portrait: boolean };

export type PetCard = {
  name: string;
  stats: PetCardStats & { health: number };
  art: number | PetCardImage;
} & (
  | { grade: 'common'; battle: PetCardBattleAction }
  | { grade: Exclude<PetCardGrade, 'common'>; battle: PetCardBattleEffect }
);

export interface PetCardPack {
  id: PetCardPackKind;
  name: string;
  unitPrice: number;
  cover: PetCardId;
  ids: PetCardId[];
  gradePools: { weight: number; ids: PetCardId[] }[];
  totalWeight: number;
  shinyIds: PetCardId[];
}

export interface PetCardCatalog {
  cards: Readonly<Record<PetCardId, PetCard>>;
  packs: Readonly<Record<PetCardPackKind, PetCardPack>>;
  packIds: readonly PetCardPackKind[];
  bonds: readonly PetCardBond[];
}

export interface PetCardPoolDefinition {
  id: string;
  name: string;
  unitPrice: number;
  weights: Record<PetCardGrade, number>;
  coverId: string | null;
  sortOrder: number;
  version: number | null;
}

export type PetCardDefinition = Omit<PetCard, 'art' | 'grade' | 'battle'> & {
  id: string;
  grade: PetCardGrade;
  battle: PetCard['battle'];
  artKey: string;
  artTile: number;
  artPortrait: boolean;
  sortOrder: number;
  version: number | null;
  poolIds: string[];
};

export interface PetCardAtlasDefinition {
  id: string;
  name: string;
  portrait: boolean;
  url: string;
}

export const petCardGradeIds = Object.keys(petCardGrades) as PetCardGrade[];
export const defaultPetCardWeights = Object.fromEntries(
  petCardGradeIds.map((id) => [id, petCardGrades[id].weight]),
) as PetCardPoolDefinition['weights'];

export function createPetCardCatalog(
  cards: PetCardCatalog['cards'],
  pools: readonly (Pick<PetCardPoolDefinition, 'id' | 'name' | 'coverId' | 'weights'> & {
    unitPrice?: number;
    ids: PetCardId[];
  })[],
  bonds: readonly PetCardBond[] = [],
): PetCardCatalog {
  const packs = Object.create(null) as Record<PetCardPackKind, PetCardPack>;
  const packIds = [];
  for (const { id, name, coverId, weights, ids, unitPrice = defaultPetCardPrice(id) } of pools) {
    const buckets = petCardGradeIds.map((grade) => ({
      weight: weights[grade],
      ids: ids.filter((cardId) => cards[cardId]?.grade === grade),
    }));
    const gradePools = buckets.filter((bucket) => bucket.ids.length && bucket.weight > 0);
    const totalWeight = gradePools.reduce((total, bucket) => total + bucket.weight, 0);
    const cover = coverId && ids.includes(coverId) ? coverId : ids[0];
    if (!cover || !totalWeight) continue;
    packs[id] = {
      id,
      name,
      unitPrice,
      cover,
      ids,
      gradePools,
      totalWeight,
      shinyIds: buckets.at(-1)?.ids ?? [],
    };
    packIds.push(id);
  }
  return { cards, packs, packIds, bonds };
}

export function defaultPetCardPrice(id: string) {
  return id === 'island' ? 50 : 100;
}
