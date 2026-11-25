import type { CollectedPetCard } from './card-play';
import type { PetCardBattleEffect } from './card-battle';
import type { PetCardStats } from './catalog';

export interface BattleShowcaseCard {
  card: CollectedPetCard;
  stats: PetCardStats;
  effect?: PetCardBattleEffect;
}

export interface BattleCardActivation {
  side: 'self' | 'opponent';
  card: CollectedPetCard;
  effectName: string;
}

export interface BattleRound {
  attacker: 'self' | 'opponent';
  roundNumber?: number;
  damage: number;
  selfHealth: number;
  opponentHealth: number;
  critical: boolean;
  dodge: boolean;
  block: boolean;
  combo?: boolean;
  lifesteal?: number;
  cardActivations?: BattleCardActivation[];
}
