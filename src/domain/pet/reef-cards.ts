import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const reefCards = {
  gull: {
    name: '寄信海鸥',
    grade: 'common',
    art: 10,
    stats: { speed: 5, health: 17 },
    battle: petCardActions.dodge,
  },
  shellTurtle: {
    name: '贝壳小龟',
    grade: 'common',
    art: 11,
    stats: { defense: 6, health: 20 },
    battle: petCardActions.attack,
  },
  seahorse: {
    name: '珊瑚海马',
    grade: 'fine',
    art: 12,
    stats: { attack: 9, speed: 6, health: 33 },
    battle: petCardRecoveryEffect,
  },
  puffer: {
    name: '气泡河豚',
    grade: 'fine',
    art: 13,
    stats: { defense: 10, health: 37 },
    battle: petCardRecoveryEffect,
  },
  jellyfish: {
    name: '海灯水母',
    grade: 'epic',
    art: 14,
    stats: { defense: 15, speed: 9, health: 60 },
    battle: nextTurnCardEffect(
      '灯海余辉',
      { kind: 'turnStart' },
      { kind: 'heal', maxHealthPercent: 8 },
    ),
  },
  dolphin: {
    name: '潮音海豚',
    grade: 'epic',
    art: 15,
    stats: { attack: 15, speed: 12, health: 56 },
    battle: nextTurnCardEffect(
      '听潮',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 8 },
    ),
  },
  orca: {
    name: '金冠虎鲸',
    grade: 'legendary',
    art: 16,
    stats: { attack: 26, defense: 17, health: 100 },
    battle: nextTurnCardEffect(
      '踏浪王冠',
      { kind: 'firstCriticalHit' },
      { kind: 'outgoingDamageBoost', percent: 18 },
    ),
  },
  manta: {
    name: '深海龙鳐',
    grade: 'legendary',
    art: 17,
    stats: { attack: 22, speed: 19, health: 94 },
    battle: nextTurnCardEffect(
      '深海伏流',
      { kind: 'turnStart' },
      { kind: 'incomingDamageReduction', percent: 15 },
    ),
  },
  coralDragon: {
    name: '虹礁羽龙',
    grade: 'shiny',
    art: 18,
    stats: { attack: 39, speed: 23, health: 134 },
    battle: nextTurnCardEffect(
      '七彩珊瑚',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack', 'defense'], percent: 12 },
    ),
  },
  narwhal: {
    name: '星潮独角鲸',
    grade: 'shiny',
    art: 19,
    stats: { attack: 33, defense: 32, health: 153 },
    battle: nextTurnCardEffect(
      '星潮回游',
      { kind: 'turnStart' },
      { kind: 'heal', maxHealthPercent: 16 },
    ),
  },
} as const;
