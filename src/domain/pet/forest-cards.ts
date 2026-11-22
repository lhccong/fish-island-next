import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const forestCards = {
  squirrel: {
    name: '松果松鼠',
    grade: 'common',
    art: 20,
    stats: { attack: 3, speed: 4, health: 17 },
    battle: petCardActions.attack,
  },
  frog: {
    name: '雨芽青蛙',
    grade: 'common',
    art: 21,
    stats: { defense: 4, health: 21 },
    battle: petCardActions.dodge,
  },
  chestnutBear: {
    name: '蜜栗小熊',
    grade: 'fine',
    art: 22,
    stats: { attack: 10, defense: 5, health: 36 },
    battle: petCardRecoveryEffect,
  },
  hedgehog: {
    name: '苔帽刺猬',
    grade: 'fine',
    art: 23,
    stats: { defense: 11, health: 34 },
    battle: petCardRecoveryEffect,
  },
  owl: {
    name: '琥珀夜鸮',
    grade: 'epic',
    art: 24,
    stats: { attack: 15, speed: 10, health: 58 },
    battle: nextTurnCardEffect(
      '夜巡瞳光',
      { kind: 'turnStart' },
      { kind: 'accuracyBoost', percentagePoints: 12 },
    ),
  },
  lynx: {
    name: '青苔山猫',
    grade: 'epic',
    art: 25,
    stats: { attack: 15, speed: 13, health: 54 },
    battle: nextTurnCardEffect(
      '苔径伏击',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 10 },
    ),
  },
  branchDeer: {
    name: '古枝木鹿',
    grade: 'legendary',
    art: 26,
    stats: { defense: 26, speed: 12, health: 107 },
    battle: nextTurnCardEffect(
      '林根守护',
      { kind: 'turnStart' },
      { kind: 'shield', maxHealthPercent: 15 },
    ),
  },
  emberEagle: {
    name: '烬羽山鹰',
    grade: 'legendary',
    art: 27,
    stats: { attack: 27, speed: 18, health: 89 },
    battle: nextTurnCardEffect(
      '烬羽俯冲',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 16 },
    ),
  },
  qilin: {
    name: '林光麒麟',
    grade: 'shiny',
    art: 28,
    stats: { attack: 34, defense: 34, health: 150 },
    battle: nextTurnCardEffect(
      '万木回春',
      { kind: 'healthBelowAtTurnStart', thresholdPercent: 40 },
      { kind: 'heal', maxHealthPercent: 18 },
    ),
  },
  pegasus: {
    name: '幻花天马',
    grade: 'shiny',
    art: 29,
    stats: { attack: 33, speed: 30, health: 137 },
    battle: nextTurnCardEffect(
      '幻花屏障',
      { kind: 'firstIncomingCriticalHit' },
      { kind: 'incomingDamageReduction', percent: 35 },
    ),
  },
} as const;
