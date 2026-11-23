import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const kingdomsWuCards = {
  hanDang: {
    name: '韩当',
    grade: 'common',
    art: 70,
    stats: { defense: 5, health: 20 },
    battle: petCardActions.dodge,
  },
  dingFeng: {
    name: '丁奉',
    grade: 'common',
    art: 71,
    stats: { attack: 4, speed: 4, health: 17 },
    battle: petCardActions.attack,
  },
  xuSheng: {
    name: '徐盛',
    grade: 'fine',
    art: 72,
    stats: { defense: 11, health: 36 },
    battle: petCardRecoveryEffect,
  },
  huangGai: {
    name: '黄盖',
    grade: 'fine',
    art: 73,
    stats: { attack: 9, defense: 5, health: 37 },
    battle: petCardRecoveryEffect,
  },
  ganNing: {
    name: '甘宁',
    grade: 'epic',
    art: 74,
    stats: { attack: 17, speed: 12, health: 54 },
    battle: nextTurnCardEffect(
      '锦帆夜袭',
      { kind: 'turnStart' },
      { kind: 'accuracyBoost', percentagePoints: 10 },
    ),
  },
  luMeng: {
    name: '吕蒙',
    grade: 'epic',
    art: 75,
    stats: { attack: 14, defense: 15, health: 62 },
    battle: nextTurnCardEffect(
      '白衣渡江',
      { kind: 'firstAttack' },
      { kind: 'outgoingDamageBoost', percent: 10 },
    ),
  },
  luXun: {
    name: '陆逊',
    grade: 'legendary',
    art: 76,
    stats: { attack: 23, speed: 20, health: 93 },
    battle: nextTurnCardEffect(
      '连营余焰',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 15 },
    ),
  },
  luSu: {
    name: '鲁肃',
    grade: 'legendary',
    art: 77,
    stats: { defense: 24, speed: 17, health: 105 },
    battle: nextTurnCardEffect(
      '江防合势',
      { kind: 'turnStart' },
      { kind: 'shield', maxHealthPercent: 14 },
    ),
  },
  sunQuan: {
    name: '孙权',
    grade: 'shiny',
    art: 78,
    stats: { attack: 32, defense: 35, health: 151 },
    battle: nextTurnCardEffect(
      '江东基业',
      { kind: 'healthBelowAtTurnStart', thresholdPercent: 40 },
      { kind: 'heal', maxHealthPercent: 18 },
    ),
  },
  zhouYu: {
    name: '周瑜',
    grade: 'shiny',
    art: 79,
    stats: { attack: 39, speed: 26, health: 136 },
    battle: nextTurnCardEffect(
      '赤壁东风',
      { kind: 'firstCriticalHit' },
      { kind: 'outgoingDamageBoost', percent: 30 },
    ),
  },
} as const;
