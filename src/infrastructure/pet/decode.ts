import type {
  Companion,
  PetItem,
  PetSkin,
  Challenger,
  BattleRound,
  PetPage,
  AutoFeed,
  ForgeDetail,
} from '@/domain/pet';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('伙伴服务返回的数据格式异常');
  return value as Record<string, unknown>;
}
export function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}
export function number(value: unknown, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) value = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('伙伴服务返回的数值异常');
  return value;
}
export function id(value: unknown): string {
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new Error('伙伴服务返回的编号异常');
}
export function image(value: unknown) {
  if (!value) return '';
  const raw = text(value);
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export function list<T>(value: unknown, decode: (v: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('伙伴服务返回的列表异常');
  return value.map(decode);
}
export function page<T>(value: unknown, decode: (v: unknown) => T): PetPage<T> {
  const data = record(value);
  return { records: list(data.records, decode), total: number(data.total) };
}
const statNames: Record<string, string> = {
  totalBaseAttack: '攻击',
  totalBaseDefense: '防御',
  totalBaseHp: '生命',
  speed: '速度',
  baseAttack: '攻击',
  baseDefense: '防御',
  baseHp: '生命',
  baseSpeed: '速度',
  critRate: '暴击率',
  dodgeRate: '闪避率',
  blockRate: '格挡率',
  comboRate: '连击率',
  lifesteal: '生命汲取',
  critResistance: '暴击抵抗',
  dodgeResistance: '闪避抵抗',
  blockResistance: '格挡抵抗',
  comboResistance: '连击抵抗',
  lifestealResistance: '汲取抵抗',
  attack: '攻击',
  defense: '防御',
  hp: '生命',
  maxHp: '生命',
  antiCrit: '暴击抵抗',
  antiDodge: '闪避抵抗',
  antiBlock: '格挡抵抗',
  antiCombo: '连击抵抗',
  antiLifesteal: '汲取抵抗',
};
function stats(value: Record<string, unknown>): [string, number][] {
  return Object.entries(value)
    .filter(([key, v]) => key in statNames && v !== undefined && v !== null)
    .map(([key, v]) => [statNames[key]!, number(v)]);
}
export function item(value: unknown, instance = false): PetItem {
  const data = record(value);
  const template = instance ? record(data.template) : data;
  return {
    id: id(data.id),
    code: text(template.code),
    name: text(template.name) || '未命名物品',
    icon: image(template.icon),
    description: text(template.description),
    category: text(template.category),
    slot: text(template.equipSlot),
    quantity: number(data.quantity, 1),
    level: number(data.enhanceLevel),
    rarity: number(template.rarity),
    price: number(template.purchasePoint),
    stats: stats(template),
  };
}
export function companion(value: unknown): Companion {
  const data = record(value);
  return {
    id: id(data.petId),
    name: text(data.name) || '我的伙伴',
    url: image(data.petUrl),
    level: number(data.level, 1),
    exp: number(data.exp),
    hunger: number(data.hunger),
    mood: number(data.mood),
    stats: data.equipStats ? stats(record(data.equipStats)) : [],
    equipment: data.equippedItems
      ? Object.entries(record(data.equippedItems))
          .filter(([, value]) => value !== null)
          .map(([slot, value]) => ({ slot, item: item(value, true) }))
      : [],
  };
}
export function skin(value: unknown): PetSkin {
  const data = record(value);
  return {
    id: id(data.skinId),
    name: text(data.name) || '伙伴外观',
    url: image(data.url),
    description: text(data.description),
    owned: data.owned === true,
    points: number(data.points),
  };
}
export function challenger(value: unknown): Challenger {
  const data = record(value);
  return {
    id: id(data.id ?? data.petId ?? data.floor),
    name: text(data.name) || '挑战对手',
    url: image(data.avatar ?? data.avatarUrl),
    health: number(data.currentHealth ?? data.health ?? data.maxHealth),
    attack: number(data.attack),
    reward: number(data.rewardPoints),
  };
}
export function round(value: unknown): BattleRound {
  const data = record(value);
  if (!['PET', 'BOSS', 'MY_PET', 'OPPONENT_PET'].includes(text(data.attackerType)))
    throw new Error('未知的回合攻击方');
  return {
    attacker: ['PET', 'MY_PET'].includes(text(data.attackerType)) ? 'self' : 'opponent',
    damage: number(data.damage),
    selfHealth: number(data.petRemainingHealth ?? data.myPetRemainingHealth),
    opponentHealth: number(data.bossRemainingHealth ?? data.opponentPetRemainingHealth),
    critical: data.isCritical === true,
    dodge: data.isDodge === true,
    block: data.isBlock === true,
  };
}
export function autoFeed(value: unknown): AutoFeed {
  const data = record(value);
  return {
    enabled: data.enabled === 1,
    foodCode: text(data.foodCode),
    threshold: number(data.triggerThreshold, 30),
    foodName: text(data.foodName),
    remaining: number(data.remainingQuantity),
  };
}
export function forge(value: unknown): ForgeDetail {
  const data = record(value);
  return {
    level: number(data.equipLevel),
    cost: number(data.nextUpgradeCost),
    chance: number(data.successRate),
    max: data.maxLevel === true,
    entries: [1, 2, 3, 4].flatMap((n) => {
      if (!data[`entry${n}`]) return [];
      const e = record(data[`entry${n}`]);
      const grade = e.grade == null ? null : number(e.grade);
      return [
        {
          number: n,
          name: statNames[text(e.attr)] || text(e.attr),
          value: number(e.value),
          locked: e.locked === true,
          grade: grade !== null && [1, 2, 3, 4, 5].includes(grade) ? grade : null,
        },
      ];
    }),
  };
}
