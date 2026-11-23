import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const kingdomsShuCards = {
  jiangWan: {
    name: '蒋琬',
    grade: 'common',
    art: 50,
    stats: { defense: 5, health: 20 },
    battle: petCardActions.attack,
  },
  feiYi: {
    name: '费祎',
    grade: 'common',
    art: 51,
    stats: { speed: 5, health: 18 },
    battle: petCardActions.dodge,
  },
  maLiang: {
    name: '马良',
    grade: 'fine',
    art: 52,
    stats: { attack: 8, speed: 7, health: 33 },
    battle: petCardRecoveryEffect,
  },
  liaoHua: {
    name: '廖化',
    grade: 'fine',
    art: 53,
    stats: { defense: 10, health: 36 },
    battle: petCardRecoveryEffect,
  },
  weiYan: {
    name: '魏延',
    grade: 'epic',
    art: 54,
    stats: { attack: 17, speed: 9, health: 56 },
    battle: nextTurnCardEffect(
      '子午奇袭',
      { kind: 'firstAttack' },
      { kind: 'outgoingDamageBoost', percent: 12 },
    ),
  },
  jiangWei: {
    name: '姜维',
    grade: 'epic',
    art: 55,
    stats: { attack: 14, defense: 12, health: 61 },
    battle: nextTurnCardEffect(
      '承志',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['defense'], percent: 12 },
    ),
  },
  huangZhong: {
    name: '黄忠',
    grade: 'legendary',
    art: 56,
    stats: { attack: 27, speed: 14, health: 92 },
    battle: nextTurnCardEffect(
      '百步穿杨',
      { kind: 'firstHit' },
      { kind: 'outgoingDamageBoost', percent: 18 },
    ),
  },
  maChao: {
    name: '马超',
    grade: 'legendary',
    art: 57,
    stats: { attack: 24, speed: 21, health: 91 },
    battle: nextTurnCardEffect(
      '西凉铁骑',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 12 },
    ),
  },
  zhugeLiang: {
    name: '诸葛亮',
    grade: 'shiny',
    art: 58,
    stats: { defense: 36, speed: 25, health: 147 },
    battle: nextTurnCardEffect(
      '八阵图',
      { kind: 'turnStart' },
      { kind: 'shield', maxHealthPercent: 18 },
    ),
  },
  zhaoYun: {
    name: '赵云',
    grade: 'shiny',
    art: 59,
    stats: { attack: 38, speed: 28, health: 138 },
    battle: nextTurnCardEffect(
      '长坂游龙',
      { kind: 'firstHit' },
      { kind: 'outgoingDamageBoost', percent: 24 },
    ),
  },
} as const;
