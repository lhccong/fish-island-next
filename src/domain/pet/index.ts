import type { TreasurePort } from './treasure';
export { treasureSites } from './treasure';
export type { TreasureSiteId, TreasureState, TreasurePort } from './treasure';
export { petCardActions, petCardRecoveryEffect } from './card-battle';
export type { PetCardBattleAction, PetCardBattleEffect } from './card-battle';
export { defaultPetCardWeights, petCardGradeIds, petCardStatLabels } from './catalog';
export type {
  PetCardAtlasDefinition,
  PetCardCatalog,
  PetCardDefinition,
  PetCardGrade,
  PetCardId,
  PetCardImage,
  PetCardPack,
  PetCardPackKind,
  PetCardPoolDefinition,
} from './catalog';
export {
  readPetCardAtlas,
  readPetCardAtlases,
  readPetCardCatalog,
  readPetCardPage,
  readPetCardPools,
} from './catalog-data';
export {
  dailyPetPackLimit,
  demoPetCardCatalog,
  emptyPetCards,
  getPetCard,
  petCardGrades,
  petCardIds,
  petCardPacks,
  petCardStatEntries,
  petCards,
  petCardsDay,
  petPackSize,
  petShowcaseLimit,
  remainingPetPacks,
  restorePetCardsProgress,
  summarizePetShowcase,
  unopenedPetPacks,
  updatePetCards,
} from './cards';
export type {
  LegacyPetCardsProgress,
  PetCardPull,
  PetCardResult,
  PetCardsAction,
  PetCardsPort,
  PetCardsProgress,
} from './cards';

export interface PetItem {
  code: string;
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  subType: string;
  slot: string;
  stackable: boolean;
  quantity: number;
  level: number;
  rarity: number;
  price: number;
  stats: [string, number][];
}
export interface PetSkin {
  id: string;
  name: string;
  url: string;
  description: string;
  owned: boolean;
  points: number;
}
export interface Companion {
  id: string;
  name: string;
  url: string;
  level: number;
  exp: number;
  hunger: number;
  mood: number;
  stats: [string, number][];
  equipment: { slot: string; item: PetItem }[];
}
export interface PetPage<T> {
  records: T[];
  total: number;
}
export interface PetRank {
  id: string;
  userId: string;
  owner: string;
  ownerAvatar: string;
  name: string;
  url: string;
  level: number;
  rank: number;
}
export interface Challenger {
  id: string;
  name: string;
  url: string;
  health: number;
  maxHealth?: number;
  level?: number;
  stats?: [string, number][];
  equipment?: Companion['equipment'];
  attack: number;
  reward: number;
}
export interface BattleRound {
  attacker: 'self' | 'opponent';
  damage: number;
  selfHealth: number;
  opponentHealth: number;
  critical: boolean;
  dodge: boolean;
  block: boolean;
  combo?: boolean;
  lifesteal?: number;
}
export interface BattlePreview {
  self: Challenger;
  opponent: Challenger;
}
export interface BattleResult {
  rounds: BattleRound[];
  win?: boolean;
  reward?: number;
}
export type BattleTarget = { kind: 'boss' | 'pet'; id: string } | { kind: 'tower' };
export interface TowerProgress {
  floor: number;
  maxOpenFloor: number;
  nextFloor: number | null;
  completed: boolean;
  next: Challenger | null;
}
export interface TowerRank {
  userId: string;
  name: string;
  avatar: string;
  rank: number;
  floor: number;
}
export interface BossRank {
  userId: string;
  name: string;
  owner: string;
  avatar: string;
  petUrl: string;
  rank: number;
  damage: number;
}
export interface AutoFeed {
  enabled: boolean;
  foodCode: string;
  threshold: number;
  foodName: string;
  remaining: number;
}
export interface EquipmentForge {
  level: number;
  entries: { number: number; name: string; value: number; locked: boolean; grade: number | null }[];
}
export interface ForgeDetail extends EquipmentForge {
  cost: number;
  chance: number;
  max: boolean;
}
export interface PetPort extends TreasurePort {
  other(userId: string, signal: AbortSignal): Promise<Companion | null>;
  bossRanks(bossId: string, signal: AbortSignal): Promise<BossRank[]>;
  batchDecompose(signal: AbortSignal): Promise<number>;
  tournament(signal: AbortSignal): Promise<{ ranks: PetRank[]; mine: number | null }>;
  compete(
    rank: number,
    signal: AbortSignal,
  ): Promise<{ win: boolean; rank: number | null; rounds: BattleRound[] }>;
  supplies(signal: AbortSignal): Promise<Supply[]>;
  supply(id: string, signal: AbortSignal): Promise<Supply>;
  draw(
    id: string,
    count: number,
    signal: AbortSignal,
  ): Promise<{ cost: number; prizes: SupplyPrize[] }>;
  drawRecords(
    page: number,
    signal: AbortSignal,
    turntableId?: string,
  ): Promise<PetPage<SupplyPrize>>;
  mine(signal: AbortSignal): Promise<Companion | null>;
  create(name: string, signal: AbortSignal): Promise<void>;
  care(
    action: 'feed' | 'pat',
    petId: string,
    signal: AbortSignal,
  ): Promise<Pick<Companion, 'id' | 'level' | 'exp' | 'hunger' | 'mood'>>;
  rename(petId: string, name: string, signal: AbortSignal): Promise<void>;
  items(
    kind: 'bag' | 'catalog' | 'shop',
    page: number,
    signal: AbortSignal,
    category?: 'consumable',
  ): Promise<PetPage<PetItem>>;
  itemAction(
    action: 'equip' | 'unequip' | 'decompose',
    id: string,
    signal: AbortSignal,
  ): Promise<void>;
  purchaseItem(templateId: string, quantity: number, signal: AbortSignal): Promise<void>;
  skins(page: number, signal: AbortSignal): Promise<PetPage<PetSkin>>;
  skinAction(action: 'set' | 'exchange', id: string, signal: AbortSignal): Promise<void>;
  ranks(signal: AbortSignal): Promise<PetRank[]>;
  bosses(signal: AbortSignal): Promise<Challenger[]>;
  preview(target: BattleTarget, signal: AbortSignal): Promise<BattlePreview>;
  battle(target: BattleTarget, signal: AbortSignal): Promise<BattleResult>;
  tower(signal: AbortSignal): Promise<TowerProgress>;
  towerFloor(floor: number, signal: AbortSignal): Promise<Challenger>;
  towerRanks(signal: AbortSignal): Promise<TowerRank[]>;
  autoFeed(petId: string, signal: AbortSignal): Promise<AutoFeed | null>;
  saveAutoFeed(petId: string, value: AutoFeed, signal: AbortSignal): Promise<AutoFeed>;
  equipmentForge(petId: string, slot: number, signal: AbortSignal): Promise<EquipmentForge | null>;
  forge(petId: string, slot: number, signal: AbortSignal): Promise<ForgeDetail>;
  forgeAction(
    action: 'upgrade' | 'refresh' | 'lock',
    petId: string,
    slot: number,
    locked: number[],
    signal: AbortSignal,
  ): Promise<boolean>;
}
export interface SupplyPrize {
  prizeKey?: string;
  qualityLevel?: number;
  convertedPoints: number | null;
  id: string;
  name: string;
  icon: string;
  quality: string;
  probability: number | null;
  time: string;
}
export interface Supply {
  progress?: { total: number; lastDrawTime: string };
  id: string;
  name: string;
  cost: number;
  guarantee: number;
  prizes: SupplyPrize[];
}
const equipmentSlotLabels = {
  weapon: '武器',
  hand: '手部',
  foot: '足部',
  head: '头部',
  necklace: '项链',
  wing: '羽翼',
  wings: '羽翼',
} as const;
export const equipmentSlots: Readonly<Record<string, string>> = equipmentSlotLabels;
export const forgeSlots = [
  { slot: 'weapon', value: '1', label: equipmentSlotLabels.weapon },
  { slot: 'hand', value: '2', label: equipmentSlotLabels.hand },
  { slot: 'foot', value: '3', label: equipmentSlotLabels.foot },
  { slot: 'head', value: '4', label: equipmentSlotLabels.head },
  { slot: 'necklace', value: '7', label: equipmentSlotLabels.necklace },
  { slot: 'wing', value: '8', label: equipmentSlotLabels.wing },
] as const;
export function boundedPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
// Legacy BattleStatsVO.fromPet: level health plus total equipment health.
export function companionBattleHealth(pet: Pick<Companion, 'level' | 'stats'>) {
  return pet.level * 100 + (pet.stats.find(([name]) => name === '生命')?.[1] ?? 0);
}
export function campPosition(x: number, y: number) {
  return { x: Math.max(16, Math.min(84, x)), y: Math.max(32, Math.min(80, y)) };
}
export {
  petBatchPackLimit,
  petCardBulkUpgradeQuote,
  petCardRequiredLevel,
  petCardStarStats,
} from './card-play';
export type {
  PetCardBatchResult,
  PetCardHistoryPage,
  PetCardOpening,
  PetCardOwned,
  PetCardPlayAction,
  PetCardPlayPort,
  PetCardPlayState,
} from './card-play';
