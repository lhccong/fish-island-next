import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const kingdomsWarlordsCards = {
  zhangBao: {
    name: '张宝',
    grade: 'common',
    art: 80,
    stats: { attack: 3, speed: 4, health: 17 },
    battle: petCardActions.attack,
  },
  zhangLiang: {
    name: '张梁',
    grade: 'common',
    art: 81,
    stats: { defense: 6, health: 18 },
    battle: petCardActions.dodge,
  },
  yanLiang: {
    name: '颜良',
    grade: 'fine',
    art: 82,
    stats: { attack: 10, speed: 6, health: 33 },
    battle: petCardRecoveryEffect,
  },
  wenChou: {
    name: '文丑',
    grade: 'fine',
    art: 83,
    stats: { attack: 10, defense: 5, health: 35 },
    battle: petCardRecoveryEffect,
  },
  yuanShao: {
    name: '袁绍',
    grade: 'epic',
    art: 84,
    stats: { attack: 16, defense: 12, health: 61 },
    battle: nextTurnCardEffect(
      '河北先声',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 10 },
    ),
  },
  huaXiong: {
    name: '华雄',
    grade: 'epic',
    art: 85,
    stats: { attack: 17, defense: 14, health: 63 },
    battle: nextTurnCardEffect(
      '关前拦阵',
      { kind: 'turnStart' },
      { kind: 'incomingDamageReduction', percent: 10 },
    ),
  },
  dongZhuo: {
    name: '董卓',
    grade: 'legendary',
    art: 86,
    stats: { attack: 23, defense: 27, health: 106 },
    battle: nextTurnCardEffect(
      '郿坞据守',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['defense'], percent: 12 },
    ),
  },
  zhangJiao: {
    name: '张角',
    grade: 'legendary',
    art: 87,
    stats: { attack: 25, speed: 18, health: 90 },
    battle: nextTurnCardEffect(
      '黄天惊雷',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 14 },
    ),
  },
  luBu: {
    name: '吕布',
    grade: 'shiny',
    art: 88,
    stats: { attack: 43, speed: 24, health: 134 },
    battle: nextTurnCardEffect(
      '飞将无双',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 20 },
    ),
  },
  diaoChan: {
    name: '貂蝉',
    grade: 'shiny',
    art: 89,
    stats: { defense: 31, speed: 31, health: 144 },
    battle: nextTurnCardEffect(
      '闭月回影',
      { kind: 'firstIncomingAttack' },
      { kind: 'incomingDamageReduction', percent: 30 },
    ),
  },
} as const;
