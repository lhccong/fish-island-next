import {
  createPetCardCatalog,
  defaultPetCardWeights,
  petCardGrades,
  petCardStatLabels,
  type PetCard,
  type PetCardCatalog,
  type PetCardId,
  type PetCardPack,
  type PetCardPackKind,
  type PetCardStat,
  type PetCardStats,
} from './catalog';
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

export { petCardGrades, petCardStatLabels } from './catalog';

const islandCards = {
  ...islandStarterCards,
  ...reefCards,
  ...forestCards,
  ...snowCards,
  ...skyCards,
} as const satisfies Record<string, PetCard>;

const kingdomsCards = {
  ...kingdomsShuCards,
  ...kingdomsWeiCards,
  ...kingdomsWuCards,
  ...kingdomsWarlordsCards,
  ...kingdomsTaoyuanCards,
} as const satisfies Record<string, PetCard>;

export const petCards = { ...islandCards, ...kingdomsCards };

export const petCardIds = Object.keys(petCards) as (keyof typeof petCards)[];
export const dailyPetPackLimit = 2;
export const petPackSize = 5;
export const petShowcaseLimit = 3;

export const demoPetCardCatalog = createPetCardCatalog(petCards, [
  {
    id: 'island',
    name: '海岛初遇',
    coverId: 'fox',
    ids: Object.keys(islandCards),
    weights: defaultPetCardWeights,
  },
  {
    id: 'kingdoms',
    name: '三国群英',
    coverId: 'guanYu',
    ids: Object.keys(kingdomsCards),
    weights: defaultPetCardWeights,
  },
]);
export const petCardPacks = demoPetCardCatalog.packs as Readonly<
  Record<'island' | 'kingdoms', PetCardPack>
>;

export function getPetCard(id: PetCardId, catalog = demoPetCardCatalog): PetCard {
  const card = catalog.cards[id];
  if (!card) throw new Error(`找不到卡牌 ${id}，请重新打开卡包。`);
  return card;
}

export function petCardStatEntries(stats: PetCardStats) {
  return (Object.keys(petCardStatLabels) as PetCardStat[]).flatMap((stat) => {
    const value = stats[stat];
    return value ? [{ stat, label: petCardStatLabels[stat], value }] : [];
  });
}

export function summarizePetShowcase(ids: readonly PetCardId[], catalog = demoPetCardCatalog) {
  const stats: PetCardStats = {};
  for (const id of ids) {
    const card = getPetCard(id, catalog);
    for (const { stat, value } of petCardStatEntries(card.stats)) {
      stats[stat] = (stats[stat] ?? 0) + value;
    }
  }
  return stats;
}

export type PetCardPull = { id: PetCardId; points: number };
export type PetCardResult = { id: number; pack: PetCardPackKind; cards: PetCardPull[] };

export interface PetCardsProgress {
  day: string;
  claimed: number;
  unopened: Record<PetCardPackKind, number>;
  pack?: PetCardPackKind;
  opened: number;
  result: PetCardResult | null;
  owned: PetCardId[];
  showcased: PetCardId[];
  points: number;
}

export type LegacyPetCardsProgress = Omit<PetCardsProgress, 'unopened' | 'result'> & {
  sealed: boolean;
  result: Omit<PetCardResult, 'pack'> | null;
};

export type PetCardsAction =
  | { type: 'claim'; pack?: PetCardPackKind }
  | { type: 'reset' }
  | { type: 'open'; pack: PetCardPackKind; packId: number }
  | { type: 'finish'; packId: number }
  | { type: 'display' | 'remove'; id: PetCardId };

export interface PetCardsPort {
  catalog(signal: AbortSignal): Promise<PetCardCatalog>;
  watch(
    userId: string,
    receive: (progress: PetCardsProgress) => void,
    fail: () => void,
  ): () => void;
  update(
    userId: string,
    action: PetCardsAction,
    catalog: PetCardCatalog,
  ): Promise<PetCardsProgress>;
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
    unopened: {},
    opened: 0,
    result: null,
    owned: [],
    showcased: [],
    points: 0,
  };
}

export function restorePetCardsProgress(
  saved: PetCardsProgress | LegacyPetCardsProgress | undefined,
): PetCardsProgress {
  if (!saved) return emptyPetCards();
  if ('unopened' in saved) return saved;
  const { sealed, result, ...progress } = saved;
  const pack = progress.pack ?? 'island';
  return {
    ...progress,
    unopened: sealed ? { [pack]: 1 } : {},
    result: result ? { ...result, pack } : null,
  };
}

export function remainingPetPacks(progress: PetCardsProgress, day: string) {
  return dailyPetPackLimit - (progress.day === day ? progress.claimed : 0);
}

export function unopenedPetPacks(progress: PetCardsProgress, pack: PetCardPackKind) {
  return Object.hasOwn(progress.unopened, pack) ? (progress.unopened[pack] ?? 0) : 0;
}

function drawCard(pack: PetCardPack, random: () => number, shiny: boolean): PetCardId {
  const chance = random();
  if (shiny && pack.shinyIds.length)
    return pack.shinyIds[Math.floor(chance * pack.shinyIds.length)] ?? pack.cover;

  let roll = chance * pack.totalWeight;
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
  catalog = demoPetCardCatalog,
): PetCardsProgress {
  switch (action.type) {
    case 'reset':
      return { ...emptyPetCards(), opened: progress.opened + 1 };
    case 'claim': {
      if (!remainingPetPacks(progress, day)) throw new Error('今日的免费卡包已领完。');
      const pack = action.pack ?? 'island';
      if (!catalog.packs[pack]) throw new Error('该卡包暂不可用。');
      return {
        ...progress,
        day,
        claimed: progress.day === day ? progress.claimed + 1 : 1,
        unopened: { ...progress.unopened, [pack]: unopenedPetPacks(progress, pack) + 1 },
        pack,
      };
    }
    case 'open': {
      if (progress.result) throw new Error('请先完成当前卡包。');
      const stock = unopenedPetPacks(progress, action.pack);
      if (!stock || action.packId !== progress.opened + 1)
        throw new Error('卡包已更新，请查看当前进度。');
      const owned = new Set(progress.owned);
      const pack = catalog.packs[action.pack];
      if (!pack) throw new Error('该卡包暂不可用。');
      const first = !pack.ids.some((id) => owned.has(id));
      let points = progress.points;
      const cards = Array.from({ length: petPackSize }, (_, index) => {
        const id = drawCard(pack, random, first && index === petPackSize - 1);
        const duplicatePoints = owned.has(id)
          ? petCardGrades[getPetCard(id, catalog).grade].points
          : 0;
        points += duplicatePoints;
        owned.add(id);
        return { id, points: duplicatePoints };
      });
      return {
        ...progress,
        unopened: { ...progress.unopened, [pack.id]: stock - 1 },
        pack: pack.id,
        opened: action.packId,
        result: { id: action.packId, pack: pack.id, cards },
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
