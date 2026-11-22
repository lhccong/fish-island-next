import type { PetCardBattleAction, PetCardBattleEffect } from './card-battle';
import { forestCards } from './forest-cards';
import { islandStarterCards } from './island-starter-cards';
import { kingdomsShuCards } from './kingdoms-shu-cards';
import { kingdomsTaoyuanCards } from './kingdoms-taoyuan-cards';
import { kingdomsWarlordsCards } from './kingdoms-warlords-cards';
import { kingdomsWeiCards } from './kingdoms-wei-cards';
import { kingdomsWuCards } from './kingdoms-wu-cards';
import { reefCards } from './reef-cards';
import { skyCards } from './sky-cards';
import { snowCards } from './snow-cards';

export const petCardGrades = {
  common: { name: '普通', weight: 46, points: 5 },
  fine: { name: '精良', weight: 28, points: 10 },
  epic: { name: '史诗', weight: 16, points: 20 },
  legendary: { name: '传说', weight: 8, points: 40 },
  shiny: { name: '闪耀', weight: 2, points: 80 },
} as const;

type Grade = keyof typeof petCardGrades;

export const petCardStatLabels = {
  attack: '攻击',
  defense: '防御',
  health: '生命',
  speed: '速度',
} as const;
type Stat = keyof typeof petCardStatLabels;
type Stats = Partial<Record<Stat, number>>;
type Card = {
  name: string;
  art: number;
  stats: Stats & { health: number };
} & (
  | { grade: 'common'; battle: PetCardBattleAction }
  | { grade: Exclude<Grade, 'common'>; battle: PetCardBattleEffect }
);

const islandCards = {
  ...islandStarterCards,
  ...reefCards,
  ...forestCards,
  ...snowCards,
  ...skyCards,
} as const satisfies Record<string, Card>;

const kingdomsCards = {
  ...kingdomsShuCards,
  ...kingdomsWeiCards,
  ...kingdomsWuCards,
  ...kingdomsWarlordsCards,
  ...kingdomsTaoyuanCards,
} as const satisfies Record<string, Card>;

export const petCards = { ...islandCards, ...kingdomsCards };

export type PetCardId = keyof typeof petCards;
export const petCardIds = Object.keys(petCards) as PetCardId[];
export const dailyPetPackLimit = 2;
export const petPackSize = 5;
export const petShowcaseLimit = 3;

function definePack(name: string, cover: PetCardId, ids: PetCardId[]) {
  return {
    name,
    cover,
    ids,
    gradePools: (Object.keys(petCardGrades) as Grade[]).map((grade) => ({
      weight: petCardGrades[grade].weight,
      ids: ids.filter((id) => petCards[id].grade === grade),
    })),
    shinyIds: ids.filter((id) => petCards[id].grade === 'shiny'),
  };
}

export const petCardPacks = {
  island: definePack('海岛初遇', 'fox', Object.keys(islandCards) as PetCardId[]),
  kingdoms: definePack('三国群英', 'guanYu', Object.keys(kingdomsCards) as PetCardId[]),
};

export type PetCardPackKind = keyof typeof petCardPacks;

export function getPetCard(id: PetCardId): Card {
  return petCards[id];
}

export function petCardStatEntries(stats: Stats) {
  return (Object.keys(petCardStatLabels) as Stat[]).flatMap((stat) => {
    const value = stats[stat];
    return value ? [{ stat, label: petCardStatLabels[stat], value }] : [];
  });
}

export function summarizePetShowcase(ids: readonly PetCardId[]) {
  const stats: Stats = {};
  for (const id of ids) {
    const card = getPetCard(id);
    for (const { stat, value } of petCardStatEntries(card.stats)) {
      stats[stat] = (stats[stat] ?? 0) + value;
    }
  }
  return stats;
}

export type PetCardPull = { id: PetCardId; points: number };
export type PetCardResult = { id: number; cards: PetCardPull[] };

export interface PetCardsProgress {
  day: string;
  claimed: number;
  sealed: boolean;
  pack?: PetCardPackKind;
  opened: number;
  result: PetCardResult | null;
  owned: PetCardId[];
  showcased: PetCardId[];
  points: number;
}

export type PetCardsAction =
  | { type: 'claim'; pack?: PetCardPackKind }
  | { type: 'reset' }
  | { type: 'open' | 'finish'; packId: number }
  | { type: 'display' | 'remove'; id: PetCardId };

export interface PetCardsPort {
  watch(
    userId: string,
    receive: (progress: PetCardsProgress) => void,
    fail: () => void,
  ): () => void;
  update(userId: string, action: PetCardsAction): Promise<PetCardsProgress>;
}

const islandDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function petCardsDay(date = new Date()) {
  return islandDate.format(date);
}

export function emptyPetCards(): PetCardsProgress {
  return {
    day: '',
    claimed: 0,
    sealed: false,
    opened: 0,
    result: null,
    owned: [],
    showcased: [],
    points: 0,
  };
}

export function remainingPetPacks(progress: PetCardsProgress, day: string) {
  return dailyPetPackLimit - (progress.day === day ? progress.claimed : 0);
}

function drawCard(
  pack: (typeof petCardPacks)[PetCardPackKind],
  random: () => number,
  shiny: boolean,
): PetCardId {
  const chance = random();
  if (shiny) return pack.shinyIds[Math.floor(chance * pack.shinyIds.length)] ?? pack.cover;

  let roll = chance * 100;
  for (const { weight, ids } of pack.gradePools) {
    if (roll < weight) return ids[Math.floor((roll / weight) * ids.length)] ?? pack.cover;
    roll -= weight;
  }
  return pack.cover;
}

export function updatePetCards(
  progress: PetCardsProgress,
  action: PetCardsAction,
  day: string,
  random = Math.random,
): PetCardsProgress {
  switch (action.type) {
    case 'reset':
      return { ...emptyPetCards(), opened: progress.opened + 1 };
    case 'claim':
      if (progress.sealed || progress.result) throw new Error('请先完成当前卡包。');
      if (!remainingPetPacks(progress, day)) throw new Error('今日的免费卡包已领完。');
      return {
        ...progress,
        day,
        claimed: progress.day === day ? progress.claimed + 1 : 1,
        sealed: true,
        pack: action.pack ?? 'island',
      };
    case 'open': {
      if (!progress.sealed || action.packId !== progress.opened + 1)
        throw new Error('卡包已更新，请查看当前进度。');
      const owned = new Set(progress.owned);
      const pack = petCardPacks[progress.pack ?? 'island'];
      const first = !pack.ids.some((id) => owned.has(id));
      let points = progress.points;
      const cards = Array.from({ length: petPackSize }, (_, index) => {
        const id = drawCard(pack, random, first && index === petPackSize - 1);
        const duplicatePoints = owned.has(id) ? petCardGrades[petCards[id].grade].points : 0;
        points += duplicatePoints;
        owned.add(id);
        return { id, points: duplicatePoints };
      });
      return {
        ...progress,
        sealed: false,
        opened: action.packId,
        result: { id: action.packId, cards },
        owned: [...owned],
        points,
      };
    }
    case 'finish':
      return progress.result?.id === action.packId ? { ...progress, result: null } : progress;
    case 'display':
      if (!progress.owned.includes(action.id)) throw new Error('请先收藏这张卡。');
      if (progress.showcased.includes(action.id)) return progress;
      if (progress.showcased.length >= petShowcaseLimit)
        throw new Error('展示柜已满，请先撤下一张。');
      return { ...progress, showcased: [...progress.showcased, action.id] };
    case 'remove':
      return { ...progress, showcased: progress.showcased.filter((id) => id !== action.id) };
  }
}
