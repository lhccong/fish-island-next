import { nextTurnCardEffect, petCardActions, petCardRecoveryEffect } from './card-battle';

export const skyCards = {
  cloudbird: {
    name: '云朵雏鸟',
    grade: 'common',
    art: 40,
    stats: { speed: 5, health: 18 },
    battle: petCardActions.dodge,
  },
  kiteMouse: {
    name: '风筝小鼠',
    grade: 'common',
    art: 41,
    stats: { attack: 4, speed: 3, health: 17 },
    battle: petCardActions.attack,
  },
  swift: {
    name: '彩羽雨燕',
    grade: 'fine',
    art: 42,
    stats: { attack: 8, speed: 9, health: 30 },
    battle: petCardRecoveryEffect,
  },
  parrotlet: {
    name: '浮泡鹦鹉',
    grade: 'fine',
    art: 43,
    stats: { defense: 8, speed: 7, health: 35 },
    battle: petCardRecoveryEffect,
  },
  flyingSquirrel: {
    name: '风铃白鼯',
    grade: 'epic',
    art: 44,
    stats: { attack: 13, speed: 14, health: 57 },
    battle: nextTurnCardEffect(
      '风铃加速',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['speed'], percent: 8 },
    ),
  },
  thunderCrow: {
    name: '雷云鸦',
    grade: 'epic',
    art: 45,
    stats: { attack: 17, speed: 10, health: 55 },
    battle: nextTurnCardEffect(
      '雷幕初鸣',
      { kind: 'firstHit' },
      { kind: 'outgoingDamageBoost', percent: 10 },
    ),
  },
  griffin: {
    name: '晨曦狮鹫',
    grade: 'legendary',
    art: 46,
    stats: { attack: 26, defense: 19, health: 96 },
    battle: nextTurnCardEffect(
      '晨曦突袭',
      { kind: 'turnStart' },
      { kind: 'statBoost', stats: ['attack'], percent: 8 },
    ),
  },
  sunsetCrane: {
    name: '夕照天鹤',
    grade: 'legendary',
    art: 47,
    stats: { defense: 22, speed: 18, health: 101 },
    battle: nextTurnCardEffect(
      '夕羽回护',
      { kind: 'turnStart' },
      { kind: 'heal', maxHealthPercent: 12 },
    ),
  },
  phoenix: {
    name: '虹环凤凰',
    grade: 'shiny',
    art: 48,
    stats: { attack: 38, speed: 25, health: 140 },
    battle: nextTurnCardEffect(
      '虹火回羽',
      { kind: 'healthBelowAtTurnStart', thresholdPercent: 25 },
      { kind: 'heal', maxHealthPercent: 22 },
    ),
  },
  butterfly: {
    name: '星轨蝶灵',
    grade: 'shiny',
    art: 49,
    stats: { attack: 32, speed: 32, health: 135 },
    battle: nextTurnCardEffect(
      '星轨结界',
      { kind: 'turnStart' },
      { kind: 'shield', maxHealthPercent: 16 },
    ),
  },
} as const;
