import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const kingdomsWeiCards = {
  liDian: {
    name: '李典',
    grade: 'common',
    art: 60,
    stats: { defense: 5, health: 19 },
    battle: petCardActions.dodge,
  },
  yueJin: {
    name: '乐进',
    grade: 'common',
    art: 61,
    stats: { attack: 5, speed: 3, health: 16 },
    battle: petCardActions.attack,
  },
  yuJin: {
    name: '于禁',
    grade: 'fine',
    art: 62,
    stats: { defense: 10, health: 36 },
    battle: petCardRecoveryEffect,
  },
  caoHong: {
    name: '曹洪',
    grade: 'fine',
    art: 63,
    stats: { attack: 10, defense: 5, health: 34 },
    battle: petCardRecoveryEffect,
  },
  zhangLiao: {
    name: '张辽',
    grade: 'epic',
    art: 64,
    stats: { attack: 16, speed: 12, health: 57 },
    battle: nextTurnCardEffect(
      '威震逍遥津',
      { kind: 'firstAttack' },
      { kind: 'outgoingDamageBoost', percent: 12 },
    ),
  },
  xuChu: {
    name: '许褚',
    grade: 'epic',
    art: 65,
    stats: { attack: 14, defense: 15, health: 63 },
    battle: nextTurnCardEffect(
      '虎卫据守',
      { kind: 'turnStart' },
      { kind: 'incomingDamageReduction', percent: 10 },
    ),
  },
  simaYi: {
    name: '司马懿',
    grade: 'legendary',
    art: 66,
    stats: { defense: 24, speed: 18, health: 104 },
    battle: nextTurnCardEffect(
      '鹰视',
      { kind: 'turnStart' },
      { kind: 'heal', maxHealthPercent: 12 },
    ),
  },
  dianWei: {
    name: '典韦',
    grade: 'legendary',
    art: 67,
    stats: { attack: 24, defense: 26, health: 107 },
    battle: nextTurnCardEffect(
      '双戟护卫',
      { kind: 'firstIncomingCriticalHit' },
      { kind: 'incomingDamageReduction', percent: 25 },
    ),
  },
  caoCao: {
    name: '曹操',
    grade: 'shiny',
    art: 68,
    stats: { attack: 34, defense: 30, health: 154 },
    battle: nextTurnCardEffect(
      '魏武挥鞭',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 12 },
    ),
  },
  xiahouDun: {
    name: '夏侯惇',
    grade: 'shiny',
    art: 69,
    stats: { attack: 39, defense: 32, health: 141 },
    battle: nextTurnCardEffect(
      '独目不屈',
      { kind: 'healthBelowAtTurnStart', thresholdPercent: 30 },
      { kind: 'statBoost', stats: ['defense'], percent: 25 },
    ),
  },
} as const;
