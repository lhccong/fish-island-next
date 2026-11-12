import { trigger as unlockAchievements } from './core.achievement';
import type { Allocation, GameState, ProfileState } from './core.state';
import { createState, propsEffect } from './core.state';
import {
  cultivationEvents,
  formatCultivationEvent,
  type CultivationEventKind,
} from './cultivation.event';
import { AchievementOpportunity } from './data.achievement.types';
import { produce } from './produce';
import { pickWeight, shuffle, type RNG } from './vitex';

interface Realm {
  name: string;
  stages: number;
  lifespan: number | null;
  years: number;
  required: number;
  world: string;
}

// Realm names follow the novels; numerical pacing is specific to this game.
export const realms: readonly Realm[] = [
  { name: '凡人', stages: 1, lifespan: 100, years: 1, required: 6, world: '人界' },
  { name: '炼气', stages: 13, lifespan: 125, years: 1, required: 5, world: '人界' },
  { name: '筑基', stages: 4, lifespan: 200, years: 2, required: 20, world: '人界' },
  { name: '结丹', stages: 4, lifespan: 500, years: 5, required: 60, world: '人界' },
  { name: '元婴', stages: 4, lifespan: 1000, years: 10, required: 130, world: '人界' },
  { name: '化神', stages: 4, lifespan: 2000, years: 20, required: 280, world: '人界' },
  { name: '炼虚', stages: 4, lifespan: null, years: 50, required: 650, world: '灵界' },
  { name: '合体', stages: 4, lifespan: null, years: 100, required: 1300, world: '灵界' },
  { name: '大乘', stages: 4, lifespan: null, years: 200, required: 2600, world: '灵界' },
  { name: '真仙', stages: 4, lifespan: null, years: 500, required: 6500, world: '仙界' },
  { name: '金仙', stages: 4, lifespan: null, years: 1000, required: 13000, world: '仙界' },
  { name: '太乙', stages: 4, lifespan: null, years: 2000, required: 26000, world: '仙界' },
  { name: '大罗', stages: 4, lifespan: null, years: 5000, required: 65000, world: '仙界' },
  { name: '道祖', stages: 1, lifespan: null, years: 0, required: 1, world: '仙界' },
];
export const roots = [
  { name: '五行杂灵根', rate: 0.85, weight: 24 },
  { name: '四灵根', rate: 1, weight: 26 },
  { name: '三灵根', rate: 1.12, weight: 24 },
  { name: '双灵根', rate: 1.25, weight: 16 },
  { name: '异灵根', rate: 1.4, weight: 7 },
  { name: '天灵根', rate: 1.6, weight: 3 },
] as const;

export const cultivationProperties: Record<keyof Allocation, string> = {
  charm: '机缘',
  intelligence: '悟性',
  strength: '根骨',
  money: '家资',
  spirit: '心性',
};

interface CultivationTalent {
  id: number;
  name: string;
  description: string;
  grade: number;
  effect?: Partial<Allocation>;
  training?: number;
  breakthrough?: number;
  protection?: number;
  lifespan?: number;
}
export const cultivationTalents: readonly CultivationTalent[] = [
  { id: 1, name: '过目不忘', description: '悟性 +2', grade: 1, effect: { intelligence: 2 } },
  { id: 2, name: '天生神力', description: '根骨 +2', grade: 1, effect: { strength: 2 } },
  { id: 3, name: '心如止水', description: '心性 +2', grade: 1, effect: { spirit: 2 } },
  { id: 4, name: '仙缘眷顾', description: '机缘 +3', grade: 2, effect: { charm: 3 } },
  { id: 5, name: '修仙世家', description: '家资 +3', grade: 2, effect: { money: 3 } },
  { id: 6, name: '苦修之士', description: '修炼速度 +20%', grade: 1, training: 0.2 },
  {
    id: 7,
    name: '丹道入门',
    description: '修炼速度 +10%，家资 +1',
    grade: 1,
    training: 0.1,
    effect: { money: 1 },
  },
  { id: 8, name: '阵法传承', description: '渡劫成功率 +10%', grade: 2, protection: 10 },
  {
    id: 9,
    name: '剑心通明',
    description: '突破成功率 +8%，心性 +1',
    grade: 2,
    breakthrough: 8,
    effect: { spirit: 1 },
  },
  { id: 10, name: '长春功', description: '有限寿元阶段，寿元上限 +30 年', grade: 1, lifespan: 30 },
  {
    id: 11,
    name: '散修出身',
    description: '根骨 +1，心性 +1',
    grade: 0,
    effect: { strength: 1, spirit: 1 },
  },
  { id: 12, name: '灵药亲和', description: '修炼速度 +15%', grade: 1, training: 0.15 },
  {
    id: 13,
    name: '大器晚成',
    description: '有限寿元阶段，寿元上限 +20 年；悟性 +1',
    grade: 1,
    lifespan: 20,
    effect: { intelligence: 1 },
  },
  {
    id: 14,
    name: '福缘深厚',
    description: '机缘 +2，渡劫成功率 +5%',
    grade: 2,
    protection: 5,
    effect: { charm: 2 },
  },
  { id: 15, name: '道心坚固', description: '突破成功率 +12%', grade: 3, breakthrough: 12 },
  {
    id: 16,
    name: '五行通感',
    description: '修炼速度 +25%，悟性 +1',
    grade: 3,
    training: 0.25,
    effect: { intelligence: 1 },
  },
];

export interface CultivationState {
  realm: number;
  stage: number;
  root: number;
  progress: number;
  failures: number;
  tribulations: number;
  nextTribulation: number | null;
  turns: number;
  talents: number[];
  ending?: 'lifespan' | 'tribulation' | 'encounter' | 'dao' | 'seclusion';
}
export interface CultivationGame extends GameState {
  cultivation: CultivationState;
}
export interface CultivationLog {
  age: number;
  text: string;
  kind: CultivationEventKind;
  eventId?: number;
}
export interface CultivationResult {
  state: CultivationGame;
  logs: CultivationLog[];
  achievements: number[];
}
export const endingNames = {
  lifespan: '寿元耗尽',
  tribulation: '陨落天劫',
  encounter: '仙途陨落',
  dao: '证道永恒',
  seclusion: '归隐山海',
};

export function drawCultivationTalents(rng?: RNG) {
  return shuffle(
    cultivationTalents.map((talent) => talent.id),
    rng,
  ).slice(0, 10);
}
export function selectedTalents(state: CultivationGame) {
  return cultivationTalents.filter((talent) => state.cultivation.talents.includes(talent.id));
}
export function realmLabel(state: CultivationState) {
  const realm = realms[state.realm]!;
  if (state.realm === 0 || state.realm === realms.length - 1) return realm.name;
  if (state.realm === 1) return `${realm.name} ${state.stage + 1} 层`;
  return `${realm.name} · ${['初期', '中期', '后期', '大圆满'][state.stage]}`;
}
export function lifespan(state: CultivationGame) {
  const base = realms[state.cultivation.realm]!.lifespan;
  return base === null
    ? null
    : base + selectedTalents(state).reduce((sum, talent) => sum + (talent.lifespan || 0), 0);
}
export function requiredProgress(state: CultivationState) {
  return Math.ceil(realms[state.realm]!.required * (1 + state.stage * 0.04));
}
export function breakthroughChance(state: CultivationGame) {
  const { intelligence, spirit, money } = state.props.current;
  const bonus = selectedTalents(state).reduce((sum, talent) => sum + (talent.breakthrough || 0), 0);
  return Math.max(
    25,
    Math.min(
      95,
      Math.round(
        49 + intelligence * 1.1 + spirit + money * 0.4 + bonus + state.cultivation.failures * 7,
      ),
    ),
  );
}
export function tribulationChance(state: CultivationGame) {
  const { strength, spirit } = state.props.current;
  return Math.max(
    40,
    Math.min(
      97,
      Math.round(
        72 +
          strength * 0.8 +
          spirit * 0.6 +
          selectedTalents(state).reduce((sum, talent) => sum + (talent.protection || 0), 0),
      ),
    ),
  );
}
export function finalize(
  state: CultivationGame,
  profile: ProfileState,
  logs: CultivationLog[],
): CultivationResult {
  const result = unlockAchievements(AchievementOpportunity.Trajectory, state, profile, (id) =>
    cultivationEvents.has(id),
  );
  return { state: result.state as CultivationGame, logs, achievements: result.triggers };
}
export function startCultivation(
  profile: ProfileState,
  allocation: Allocation,
  talentIds: number[],
  rng?: RNG,
): CultivationResult {
  const values = Object.values(allocation);
  if (
    values.length !== 5 ||
    values.some((value) => !Number.isInteger(value) || value < 0 || value > 10) ||
    values.reduce((sum, value) => sum + value, 0) !== 20
  )
    throw new Error('Invalid cultivation allocation');
  if (
    talentIds.length !== 3 ||
    new Set(talentIds).size !== 3 ||
    talentIds.some((id) => !cultivationTalents.some((talent) => talent.id === id))
  )
    throw new Error('Invalid cultivation talents');
  const root =
    pickWeight(
      roots.map((item, index) => [index, item.weight] as [number, number]),
      rng,
    ) ?? 0;
  let state: CultivationGame = {
    ...createState(allocation),
    cultivation: {
      realm: 0,
      stage: 0,
      root,
      progress: 0,
      failures: 0,
      tribulations: 0,
      nextTribulation: null,
      turns: 0,
      talents: [...talentIds],
    },
  };
  state = produce(state, (draft) => {
    draft.props = propsEffect(draft.props, { age: 1 });
    for (const talent of selectedTalents(state))
      draft.props = propsEffect(draft.props, talent.effect || {});
    draft.events.add(910000);
  });
  return finalize(state, profile, [
    { age: 0, eventId: 910000, text: formatCultivationEvent(910000), kind: 'normal' },
  ]);
}

export function finishCultivation(state: CultivationGame, profile: ProfileState): ProfileState {
  if (!state.cultivation.ending) throw new Error('Cultivation has not ended');
  return {
    ...profile,
    times: profile.times + 1,
    achievements: new Set([
      ...profile.achievements,
      ...Array.from(state.achievements).filter((id) => cultivationEvents.has(id)),
    ]),
    cultivation: {
      times: (profile.cultivation?.times || 0) + 1,
      bestRealm: Math.max(profile.cultivation?.bestRealm || 0, state.cultivation.realm),
      bestAge: Math.max(profile.cultivation?.bestAge || 0, state.props.current.age),
      events: Array.from(new Set([...(profile.cultivation?.events || []), ...state.events])),
    },
  };
}
