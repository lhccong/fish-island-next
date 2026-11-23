import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const kingdomsTaoyuanCards = {
  jianYong: {
    name: '简雍',
    grade: 'common',
    art: 90,
    stats: { speed: 5, health: 18 },
    battle: petCardActions.dodge,
  },
  sunQian: {
    name: '孙乾',
    grade: 'common',
    art: 91,
    stats: { defense: 5, health: 20 },
    battle: petCardActions.attack,
  },
  miZhu: {
    name: '糜竺',
    grade: 'fine',
    art: 92,
    stats: { defense: 8, speed: 7, health: 35 },
    battle: petCardRecoveryEffect,
  },
  chenDao: {
    name: '陈到',
    grade: 'fine',
    art: 93,
    stats: { attack: 8, defense: 9, health: 34 },
    battle: petCardRecoveryEffect,
  },
  pangTong: {
    name: '庞统',
    grade: 'epic',
    art: 94,
    stats: { attack: 17, speed: 11, health: 54 },
    battle: nextTurnCardEffect(
      '凤雏伏策',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 8 },
    ),
  },
  faZheng: {
    name: '法正',
    grade: 'epic',
    art: 95,
    stats: { attack: 15, defense: 13, health: 60 },
    battle: nextTurnCardEffect(
      '定军良谋',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 12 },
    ),
  },
  zhangFei: {
    name: '张飞',
    grade: 'legendary',
    art: 96,
    stats: { attack: 28, defense: 19, health: 96 },
    battle: nextTurnCardEffect(
      '长坂怒喝',
      { kind: 'firstAttack' },
      { kind: 'outgoingDamageBoost', percent: 20 },
    ),
  },
  xuShu: {
    name: '徐庶',
    grade: 'legendary',
    art: 97,
    stats: { defense: 24, speed: 18, health: 99 },
    battle: nextTurnCardEffect(
      '走马荐贤',
      { kind: 'turnStart' },
      { kind: 'incomingDamageReduction', percent: 15 },
    ),
  },
  liuBei: {
    name: '刘备',
    grade: 'shiny',
    art: 98,
    stats: { defense: 38, speed: 22, health: 157 },
    battle: nextTurnCardEffect(
      '桃园结义',
      { kind: 'afterFirstIncomingCriticalHit' },
      { kind: 'heal', maxHealthPercent: 15 },
    ),
  },
  guanYu: {
    name: '关羽',
    grade: 'shiny',
    art: 99,
    stats: { attack: 41, defense: 31, health: 143 },
    battle: nextTurnCardEffect(
      '青龙偃月',
      { kind: 'firstHit' },
      { kind: 'outgoingDamageBoost', percent: 26 },
    ),
  },
} as const;
