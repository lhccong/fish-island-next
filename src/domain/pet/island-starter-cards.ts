import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const islandStarterCards = {
  radish: {
    name: '拾贝萝卜',
    grade: 'common',
    art: 0,
    stats: { attack: 4, health: 18 },
    battle: petCardActions.attack,
  },
  crab: {
    name: '潮汐小蟹',
    grade: 'common',
    art: 1,
    stats: { defense: 5, health: 16 },
    battle: petCardActions.dodge,
  },
  raincoat: {
    name: '雨衣萝卜',
    grade: 'fine',
    art: 2,
    stats: { defense: 9, health: 36 },
    battle: petCardRecoveryEffect,
  },
  seal: {
    name: '潜水小海豹',
    grade: 'fine',
    art: 3,
    stats: { attack: 8, speed: 6, health: 30 },
    battle: petCardRecoveryEffect,
  },
  rabbit: {
    name: '提灯月兔',
    grade: 'epic',
    art: 4,
    stats: { attack: 14, speed: 11, health: 55 },
    battle: nextTurnCardEffect(
      '月灯引路',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['speed'], percent: 15 },
    ),
  },
  octopus: {
    name: '抱月章鱼',
    grade: 'epic',
    art: 5,
    stats: { defense: 16, speed: 8, health: 62 },
    battle: nextTurnCardEffect(
      '潮月护体',
      { kind: 'turnStart' },
      { kind: 'shield', maxHealthPercent: 8 },
    ),
  },
  lion: {
    name: '日冕幼狮',
    grade: 'legendary',
    art: 6,
    stats: { attack: 24, speed: 15, health: 90 },
    battle: nextTurnCardEffect(
      '日冕烈爪',
      { kind: 'turnStart' },
      { kind: 'criticalChanceBoost', percentagePoints: 10 },
    ),
  },
  whale: {
    name: '云翼小鲸',
    grade: 'legendary',
    art: 7,
    stats: { attack: 20, defense: 25, health: 105 },
    battle: nextTurnCardEffect(
      '云翼共鸣',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 10 },
    ),
  },
  fox: {
    name: '极光灵狐',
    grade: 'shiny',
    art: 8,
    stats: { attack: 36, speed: 24, health: 132 },
    battle: nextTurnCardEffect('极光锐爪', { kind: 'firstHit' }, { kind: 'guaranteedCriticalHit' }),
  },
  star: {
    name: '彗星团子',
    grade: 'shiny',
    art: 9,
    stats: { attack: 29, defense: 38, health: 160 },
    battle: nextTurnCardEffect(
      '彗星庇护',
      { kind: 'healthBelowAtTurnStart', thresholdPercent: 30 },
      { kind: 'heal', maxHealthPercent: 20 },
    ),
  },
} as const;
