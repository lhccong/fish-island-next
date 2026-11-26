import type { PetCardId } from './catalog';

export const petCardBondAttributeLabels = {
  comboRate: '连击率',
  critRate: '暴击率',
  dodgeRate: '闪避率',
  blockRate: '格挡率',
  lifesteal: '吸血率',
  comboResistance: '抗连击',
  critResistance: '抗暴击',
  dodgeResistance: '抗闪避',
  blockResistance: '抗格挡',
  lifestealResistance: '抗吸血',
} as const;

export interface PetCardBondBonus {
  attribute: keyof typeof petCardBondAttributeLabels;
  percentagePoints: number;
}

export interface PetCardBond {
  id: string;
  name: string;
  cardIds: readonly PetCardId[];
  three: readonly PetCardBondBonus[];
  six: readonly PetCardBondBonus[];
}
