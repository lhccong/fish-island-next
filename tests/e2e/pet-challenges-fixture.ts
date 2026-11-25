export const petCardActivation = {
  side: 'self',
  card: {
    id: 'battle-test-card',
    name: '潮月守卫',
    stars: 1,
    grade: 'epic',
    artKey: `${'a'.repeat(64)}.jpg`,
    artTile: 5,
    portrait: false,
  },
  effectName: '潮月护体',
};

export const opponentCardActivation = {
  side: 'opponent',
  card: { ...petCardActivation.card, id: 'opponent-test-card', name: '极光灵狐', artTile: 8 },
  effectName: '极光锐爪',
};

const duelShowcase = [
  {
    card: petCardActivation.card,
    stats: { health: 65, defense: 12 },
    effect: {
      kind: 'effect',
      name: petCardActivation.effectName,
      turnOffset: 1,
      trigger: { kind: 'turnStart' },
      outcome: { kind: 'shield', maxHealthPercent: 20 },
    },
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    card: {
      ...petCardActivation.card,
      id: `common-${index}`,
      name: `苔光种子 ${index + 1}`,
      grade: 'common',
      artTile: index,
      stars: 2,
    },
    stats: { health: 12, speed: 5 },
  })),
];

export function createPetChallengeState() {
  return {
    battleCount: 0,
    failBattle: false,
    battleEmpty: false,
    battleEffects: false,
    duelShowcase: false,
    bossHealth: 90,
    towerFloor: 2,
    towerCompleted: false,
    towerMissing: false,
    holdChallenges: false,
    releaseChallenges: () => {},
  };
}
const paths = [
  'boss/ranking',
  'boss/list/cache',
  'boss/battle/info',
  'pet/battle/info',
  'pet/battle/start',
  'boss/battle',
  'tower/challenge',
  'tower/progress',
  'tower/floor',
  'tower/ranking',
];
export function isPetChallengePath(path: string) {
  return paths.includes(path);
}
export function petChallengeResponse(
  path: string,
  url: URL,
  state: ReturnType<typeof createPetChallengeState> & { panelEmpty: boolean },
  pet: {
    petId: string;
    name: string;
    petUrl: string;
    level: number;
    equipStats: { totalBaseHp: number };
    equippedItems?: Record<string, unknown>;
  },
) {
  const boss = {
    id: '91',
    name: '林地守卫',
    avatar: 'https://camp.test/companion.svg',
    health: 90,
    attack: 10,
    rewardPoints: 15,
  };
  let data: unknown;
  if (path === 'boss/ranking')
    data = state.panelEmpty
      ? []
      : [{ userId: '124', petName: '栗栗', userName: '合成岛友乙', rank: 1, damage: 125 }];
  else if (path === 'boss/list/cache')
    data = state.panelEmpty ? [] : [{ ...boss, health: state.bossHealth }];
  else if (path === 'boss/battle/info')
    data = {
      petInfo: {
        petId: pet.petId,
        name: pet.name,
        avatar: pet.petUrl,
        health: 120,
        equippedItems: pet.equippedItems,
      },
      bossInfo: { ...boss, currentHealth: state.bossHealth, maxHealth: 90 },
    };
  else if (path === 'pet/battle/info')
    data = {
      myPet: {
        petId: pet.petId,
        name: pet.name,
        avatar: pet.petUrl,
        health: 120,
        equippedItems: pet.equippedItems,
        ...(state.duelShowcase ? { showcaseCards: duelShowcase } : {}),
      },
      opponentPet: {
        petId: '18',
        name: '栗栗',
        avatar: pet.petUrl,
        health: 90,
        equippedItems: pet.equippedItems,
        ...(state.duelShowcase
          ? {
              showcaseCards: [
                {
                  card: opponentCardActivation.card,
                  stats: { attack: 20 },
                  effect: {
                    kind: 'effect',
                    name: opponentCardActivation.effectName,
                    turnOffset: 1,
                    trigger: { kind: 'firstHit' },
                    outcome: { kind: 'guaranteedCriticalHit' },
                  },
                },
              ],
            }
          : {}),
      },
    };
  else if (['pet/battle/start', 'boss/battle', 'tower/challenge'].includes(path)) {
    state.battleCount++;
    if (state.failBattle) return { code: 40000, message: '挑战次数不足，请明日再试' };
    const rounds = state.battleEffects
      ? [
          {
            attackerType: 'PET',
            roundNumber: 1,
            damage: 0,
            petRemainingHealth: 120,
            bossRemainingHealth: 90,
            isDodge: true,
            ...(path === 'tower/challenge' ? { cardActivations: [petCardActivation] } : {}),
          },
          {
            attackerType: 'BOSS',
            roundNumber: 1,
            damage: 5,
            petRemainingHealth: 115,
            bossRemainingHealth: 90,
            isBlock: true,
            cardActivations:
              path === 'pet/battle/start'
                ? [petCardActivation, opponentCardActivation]
                : [petCardActivation],
          },
          {
            attackerType: 'PET',
            roundNumber: 2,
            damage: 20,
            petRemainingHealth: 120,
            bossRemainingHealth: 70,
            isCombo: true,
            lifestealHeal: 5,
          },
          {
            attackerType: 'PET',
            roundNumber: 2,
            damage: 70,
            petRemainingHealth: 120,
            bossRemainingHealth: 0,
            isCritical: true,
          },
        ]
      : state.battleEmpty
        ? []
        : [
            { attackerType: 'PET', damage: 45, petRemainingHealth: 120, bossRemainingHealth: 45 },
            { attackerType: 'BOSS', damage: 10, petRemainingHealth: 110, bossRemainingHealth: 45 },
            {
              attackerType: 'PET',
              damage: 45,
              petRemainingHealth: 110,
              bossRemainingHealth: 0,
              isCritical: true,
            },
          ];
    if (path === 'tower/challenge' && !state.battleEmpty) state.towerFloor++;
    if (path === 'tower/challenge')
      for (const round of rounds)
        round.petRemainingHealth += pet.level * 100 + pet.equipStats.totalBaseHp - 120;
    data =
      path === 'tower/challenge' ? { battleRounds: rounds, win: true, rewardPoints: 10 } : rounds;
  } else if (path === 'tower/progress')
    data = {
      maxFloor: state.towerFloor,
      maxOpenFloor: 100,
      nextFloor: state.towerCompleted ? null : state.towerFloor + 1,
      completed: state.towerCompleted,
      nextMonster:
        state.towerCompleted || state.towerMissing
          ? null
          : {
              ...boss,
              name: `第 ${state.towerFloor + 1} 层守卫`,
              floor: state.towerFloor + 1,
              avatarUrl: boss.avatar,
            },
    };
  else if (path === 'tower/floor')
    data = {
      ...boss,
      name: `第 ${url.searchParams.get('floor')} 层守卫`,
      floor: Number(url.searchParams.get('floor')),
      avatarUrl: boss.avatar,
    };
  else if (path === 'tower/ranking')
    data = state.panelEmpty
      ? []
      : [{ userId: '123', userName: '合成岛友', rank: 1, maxFloor: state.towerFloor }];
  return { code: 0, data };
}
