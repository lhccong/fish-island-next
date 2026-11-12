export interface PetItem {
  code: string;
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  slot: string;
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
  completed: boolean;
  next: Challenger | null;
}
export interface AutoFeed {
  enabled: boolean;
  foodCode: string;
  threshold: number;
  foodName: string;
  remaining: number;
}
export interface ForgeDetail {
  level: number;
  cost: number;
  chance: number;
  max: boolean;
  entries: { number: number; name: string; value: number; locked: boolean }[];
}
export interface PetPort {
  other(userId: string, signal: AbortSignal): Promise<Companion | null>;
  bossRanks(
    bossId: string,
    signal: AbortSignal,
  ): Promise<{ userId: string; name: string; owner: string; rank: number; damage: number }[]>;
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
  drawRecords(page: number, signal: AbortSignal): Promise<PetPage<SupplyPrize>>;
  mine(signal: AbortSignal): Promise<Companion | null>;
  create(name: string, signal: AbortSignal): Promise<void>;
  care(action: 'feed' | 'pat', petId: string, signal: AbortSignal): Promise<Companion>;
  rename(petId: string, name: string, signal: AbortSignal): Promise<void>;
  items(
    kind: 'bag' | 'catalog' | 'shop',
    page: number,
    signal: AbortSignal,
  ): Promise<PetPage<PetItem>>;
  itemAction(
    action: 'equip' | 'unequip' | 'purchase' | 'decompose',
    id: string,
    signal: AbortSignal,
  ): Promise<void>;
  skins(page: number, signal: AbortSignal): Promise<PetPage<PetSkin>>;
  skinAction(action: 'set' | 'exchange', id: string, signal: AbortSignal): Promise<void>;
  ranks(signal: AbortSignal): Promise<PetRank[]>;
  bosses(signal: AbortSignal): Promise<Challenger[]>;
  preview(target: BattleTarget, signal: AbortSignal): Promise<BattlePreview>;
  battle(target: BattleTarget, signal: AbortSignal): Promise<BattleResult>;
  tower(signal: AbortSignal): Promise<TowerProgress>;
  autoFeed(petId: string, signal: AbortSignal): Promise<AutoFeed | null>;
  saveAutoFeed(petId: string, value: AutoFeed, signal: AbortSignal): Promise<AutoFeed>;
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
  convertedPoints: number | null;
  id: string;
  name: string;
  icon: string;
  quality: string;
  probability: number | null;
  time: string;
}
export interface Supply {
  id: string;
  name: string;
  cost: number;
  guarantee: number;
  prizes: SupplyPrize[];
}
export const equipmentSlots: Readonly<Record<string, string>> = {
  weapon: '武器',
  hand: '手部',
  foot: '足部',
  head: '头部',
  necklace: '项链',
  wing: '羽翼',
  wings: '羽翼',
};
export const forgeSlots = [
  { value: '1', label: '武器' },
  { value: '2', label: '手部' },
  { value: '3', label: '足部' },
  { value: '4', label: '头部' },
  { value: '7', label: '项链' },
  { value: '8', label: '羽翼' },
] as const;
export function boundedPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
export function campPosition(x: number, y: number) {
  return { x: Math.max(16, Math.min(84, x)), y: Math.max(32, Math.min(80, y)) };
}
