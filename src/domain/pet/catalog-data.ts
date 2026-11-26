import {
  createPetCardCatalog,
  defaultPetCardPrice,
  petCardGradeIds,
  petCardStatLabels,
  type PetCard,
  type PetCardAtlasDefinition,
  type PetCardDefinition,
  type PetCardPoolDefinition,
} from './catalog';
import type { PetCardBattleEffect } from './card-battle';
import { petCardBondAttributeLabels, type PetCardBondBonus } from './card-bonds';

const code = /^[A-Za-z][A-Za-z0-9_-]{0,47}$/;
const atlasKey = /^[a-f0-9]{64}\.(jpg|png)$/;
const triggers = [
  'turnStart',
  'firstAttack',
  'firstIncomingAttack',
  'firstHit',
  'firstCriticalHit',
  'firstIncomingCriticalHit',
  'afterFirstIncomingCriticalHit',
  'healthBelowAtTurnStart',
];

function check(condition: unknown): asserts condition {
  if (!condition) throw new Error('卡池数据异常，请刷新后重试。');
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  check(Array.isArray(value));
  return value;
}
function string(value: unknown, pattern?: RegExp): string {
  check(typeof value === 'string' && value.length > 0 && (!pattern || pattern.test(value)));
  return value;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max);
  return value;
}
function bool(value: unknown): boolean {
  check(typeof value === 'boolean');
  return value;
}

function readBattle(value: unknown, grade: PetCardDefinition['grade']): PetCard['battle'] {
  if (grade === 'common') {
    const battle = record(value);
    check(battle.kind === 'action' && battle.phase === 'afterReveal');
    check(battle.action === 'attack' || battle.action === 'dodge');
    return { kind: 'action', phase: 'afterReveal', action: battle.action };
  }
  return readPetCardBattleEffect(value, grade);
}

export function readPetCardBattleEffect(
  value: unknown,
  grade: PetCardDefinition['grade'],
): PetCardBattleEffect {
  const battle = record(value);
  const trigger = record(battle.trigger);
  const outcome = record(battle.outcome);
  check(
    battle.kind === 'effect' &&
      battle.turnOffset === 1 &&
      typeof battle.name === 'string' &&
      battle.name.length,
  );
  check(typeof trigger.kind === 'string' && triggers.includes(trigger.kind));
  if (trigger.kind === 'healthBelowAtTurnStart') integer(trigger.thresholdPercent, 1, 100);
  switch (outcome.kind) {
    case 'statBoost':
      check(
        list(outcome.stats).length > 0 &&
          list(outcome.stats).every(
            (stat) => stat === 'attack' || stat === 'defense' || stat === 'speed',
          ),
      );
      integer(outcome.percent, 1, 100);
      break;
    case 'criticalChanceBoost':
    case 'accuracyBoost':
      integer(outcome.percentagePoints, 1, 100);
      break;
    case 'incomingDamageReduction':
    case 'outgoingDamageBoost':
      integer(outcome.percent, 1, 100);
      break;
    case 'heal':
    case 'shield':
      integer(outcome.maxHealthPercent, 1, 100);
      break;
    case 'guaranteedCriticalHit':
      check(trigger.kind === 'firstHit');
      break;
    default:
      check(false);
  }
  check(grade !== 'common');
  check(grade !== 'fine' || (trigger.kind === 'turnStart' && outcome.kind === 'heal'));
  return battle as unknown as PetCardBattleEffect;
}

export function readPetCardDefinition(value: unknown): PetCardDefinition {
  const card = record(value);
  const grade = petCardGradeIds.find((id) => id === card.grade);
  check(grade);
  const stats = record(card.stats);
  const health = integer(stats.health, 1, 1000000);
  const extra = Object.fromEntries(
    Object.keys(petCardStatLabels).flatMap((key) =>
      key === 'health' || stats[key] === undefined ? [] : [[key, integer(stats[key], 0, 1000000)]],
    ),
  );
  return {
    id: string(card.id, code),
    name: string(card.name),
    grade,
    stats: { ...extra, health },
    battle: readBattle(card.battle, grade),
    artKey: string(card.artKey, atlasKey),
    artTile: integer(card.artTile, 0, 9),
    artPortrait: bool(card.artPortrait),
    sortOrder: integer(card.sortOrder),
    version: integer(card.version, 1),
    poolIds: list(card.poolIds).map((id) => string(id, code)),
  };
}

export function readPetCardPool(value: unknown): PetCardPoolDefinition {
  const pool = record(value);
  const weights = record(pool.weights);
  const id = string(pool.id, code);
  return {
    id,
    name: string(pool.name),
    weights: Object.fromEntries(
      petCardGradeIds.map((grade) => [grade, integer(weights[grade], 0, 10000)]),
    ) as PetCardPoolDefinition['weights'],
    coverId: pool.coverId == null ? null : string(pool.coverId, code),
    unitPrice:
      pool.unitPrice == null ? defaultPetCardPrice(id) : integer(pool.unitPrice, 1, 1000000),
    sortOrder: integer(pool.sortOrder),
    version: integer(pool.version, 1),
  };
}

export function readPetCardPools(value: unknown) {
  return list(value).map(readPetCardPool);
}

export function readPetCardAtlas(
  value: unknown,
  url: (key: string) => string,
): PetCardAtlasDefinition {
  const atlas = record(value);
  const id = string(atlas.id, atlasKey);
  return { id, name: string(atlas.name), portrait: bool(atlas.portrait), url: url(id) };
}

export function readPetCardAtlases(value: unknown, url: (key: string) => string) {
  return list(value).map((atlas) => readPetCardAtlas(atlas, url));
}

export function readPetCardPage(value: unknown) {
  const page = record(value);
  const total =
    typeof page.total === 'string' && /^\d+$/.test(page.total) ? Number(page.total) : page.total;
  return { items: list(page.items).map(readPetCardDefinition), total: integer(total) };
}

function readBondBonuses(value: unknown): PetCardBondBonus[] {
  const bonuses = list(value).map((value) => {
    const bonus = record(value);
    const attribute = string(bonus.attribute) as keyof typeof petCardBondAttributeLabels;
    check(Object.hasOwn(petCardBondAttributeLabels, attribute));
    return { attribute, percentagePoints: integer(bonus.percentagePoints, 1, 100) };
  });
  check(
    bonuses.length > 0 &&
      new Set(bonuses.map(({ attribute }) => attribute)).size === bonuses.length,
  );
  return bonuses;
}

export function readPetCardCatalog(value: unknown, imageUrl: (key: string) => string) {
  const catalog = record(value);
  const cards = list(catalog.cards).map(readPetCardDefinition);
  const poolCards = new Map<string, string[]>();
  const definitions = Object.create(null) as Record<string, PetCard>;
  for (const card of cards) {
    check(!definitions[card.id]);
    const { name, stats, grade, battle, artKey, artTile, artPortrait } = card;
    definitions[card.id] = {
      name,
      stats,
      grade,
      battle,
      art: { url: imageUrl(artKey), tile: artTile, portrait: artPortrait },
    } as PetCard;
    for (const poolId of card.poolIds) {
      const ids = poolCards.get(poolId) ?? [];
      ids.push(card.id);
      poolCards.set(poolId, ids);
    }
  }
  const assigned = new Set<string>();
  const bonds = list(catalog.factionBonds ?? []).flatMap((value) => {
    const bond = record(value);
    const cardIds = list(bond.cardIds).map((value) => string(value, code));
    check(cardIds.length >= 6);
    for (const id of cardIds) {
      check(!assigned.has(id));
      assigned.add(id);
    }
    const id = string(bond.id, code);
    const name = string(bond.name);
    const three = readBondBonuses(bond.three);
    const six = readBondBonuses(bond.six);
    const available = cardIds.filter((id) => definitions[id]);
    return available.length >= 3 ? [{ id, name, cardIds: available, three, six }] : [];
  });
  check(new Set(bonds.map(({ id }) => id)).size === bonds.length);
  return createPetCardCatalog(
    definitions,
    readPetCardPools(catalog.pools).map((pool) => ({ ...pool, ids: poolCards.get(pool.id) ?? [] })),
    bonds,
  );
}
