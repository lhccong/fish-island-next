import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const snowCards = {
  penguin: {
    name: '围巾企鹅',
    grade: 'common',
    art: 30,
    stats: { defense: 5, health: 19 },
    battle: petCardActions.attack,
  },
  snowRabbit: {
    name: '雪团兔',
    grade: 'common',
    art: 31,
    stats: { speed: 6, health: 16 },
    battle: petCardActions.dodge,
  },
  raccoon: {
    name: '冻湖小狸',
    grade: 'fine',
    art: 32,
    stats: { attack: 8, speed: 8, health: 31 },
    battle: petCardRecoveryEffect,
  },
  walrus: {
    name: '浮冰海象',
    grade: 'fine',
    art: 33,
    stats: { defense: 10, health: 39 },
    battle: petCardRecoveryEffect,
  },
  ferret: {
    name: '霜枝雪貂',
    grade: 'epic',
    art: 34,
    stats: { attack: 15, speed: 13, health: 57 },
    battle: nextTurnCardEffect(
      '霜梢穿行',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['speed'], percent: 18 },
    ),
  },
  bellLamb: {
    name: '铃铛雪羊',
    grade: 'epic',
    art: 35,
    stats: { defense: 16, speed: 7, health: 64 },
    battle: nextTurnCardEffect(
      '雪铃回响',
      { kind: 'turnStart' },
      { kind: 'incomingDamageReduction', percent: 10 },
    ),
  },
  polarBear: {
    name: '冰冠白熊',
    grade: 'legendary',
    art: 36,
    stats: { attack: 23, defense: 27, health: 105 },
    battle: nextTurnCardEffect(
      '封冻壁垒',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['defense'], percent: 12 },
    ),
  },
  wolf: {
    name: '凛风雪狼',
    grade: 'legendary',
    art: 37,
    stats: { attack: 25, speed: 19, health: 93 },
    battle: nextTurnCardEffect(
      '雪夜追击',
      { kind: 'firstAttack' },
      { kind: 'outgoingDamageBoost', percent: 15 },
    ),
  },
  iceDragon: {
    name: '冰虹飞龙',
    grade: 'shiny',
    art: 38,
    stats: { attack: 37, defense: 31, health: 143 },
    battle: nextTurnCardEffect(
      '冰虹棱镜',
      { kind: 'turnStart' },
      { kind: 'shield', maxHealthPercent: 20 },
    ),
  },
  snowLeopard: {
    name: '银河雪豹',
    grade: 'shiny',
    art: 39,
    stats: { attack: 37, speed: 28, health: 133 },
    battle: nextTurnCardEffect(
      '银河猎步',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 20 },
    ),
  },
} as const;
