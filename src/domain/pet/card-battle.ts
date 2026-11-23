export type PetCardBattleAction = {
  kind: 'action';
  action: 'attack' | 'dodge';
  phase: 'afterReveal';
};

type EffectTrigger =
  | {
      kind:
        | 'turnStart'
        | 'firstAttack'
        | 'firstIncomingAttack'
        | 'firstHit'
        | 'firstCriticalHit'
        | 'firstIncomingCriticalHit'
        | 'afterFirstIncomingCriticalHit';
    }
  | { kind: 'healthBelowAtTurnStart'; thresholdPercent: number };

type EffectOutcome =
  | { kind: 'statBoost'; stats: readonly ('attack' | 'defense' | 'speed')[]; percent: number }
  | { kind: 'criticalChanceBoost' | 'accuracyBoost'; percentagePoints: number }
  | { kind: 'outgoingDamageBoost' | 'incomingDamageReduction'; percent: number }
  | { kind: 'shield' | 'heal'; maxHealthPercent: number }
  | { kind: 'guaranteedCriticalHit' };

export type PetCardBattleEffect = {
  kind: 'effect';
  name: string;
  // Triggers and continuing bonuses are scoped to the turn after the card is played.
  turnOffset: 1;
  trigger: EffectTrigger;
  outcome: EffectOutcome;
};

export const petCardActions = {
  attack: { kind: 'action', action: 'attack', phase: 'afterReveal' },
  dodge: { kind: 'action', action: 'dodge', phase: 'afterReveal' },
} as const satisfies Record<PetCardBattleAction['action'], PetCardBattleAction>;

export function nextTurnCardEffect(
  name: string,
  trigger: EffectTrigger,
  outcome: EffectOutcome,
): PetCardBattleEffect {
  return { kind: 'effect', name, turnOffset: 1, trigger, outcome };
}

export const petCardRecoveryEffect = nextTurnCardEffect(
  '回血',
  { kind: 'turnStart' },
  { kind: 'heal', maxHealthPercent: 6 },
);
