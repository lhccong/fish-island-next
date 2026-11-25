import type { PetCardBattleEffect } from '@/domain/pet';

const eventLabels = {
  firstAttack: '首次攻击时',
  firstIncomingAttack: '首次受到攻击时',
  firstHit: '首次攻击命中时',
  firstCriticalHit: '首次造成暴击时',
  firstIncomingCriticalHit: '首次受到暴击时',
  afterFirstIncomingCriticalHit: '首次受到暴击后',
};

const statLabels = { attack: '攻击力', defense: '防御力', speed: '速度' };
const chanceLabels = {
  criticalChanceBoost: '暴击率',
  accuracyBoost: '命中率',
};

function triggerText({ trigger, outcome }: PetCardBattleEffect): string {
  if (trigger.kind === 'healthBelowAtTurnStart') {
    return `生效回合开始时若生命低于 ${trigger.thresholdPercent}%`;
  }
  if (trigger.kind === 'turnStart') {
    return outcome.kind === 'heal' || outcome.kind === 'shield' ? '生效回合开始时' : '生效回合内';
  }
  return `生效回合${eventLabels[trigger.kind]}`;
}

function outcomeText(outcome: PetCardBattleEffect['outcome']): string {
  switch (outcome.kind) {
    case 'statBoost': {
      const stats = outcome.stats.map((stat) => statLabels[stat]).join('和');
      return `${stats}${outcome.stats.length > 1 ? '各' : ''}提高 ${outcome.percent}%`;
    }
    case 'criticalChanceBoost':
    case 'accuracyBoost':
      return `${chanceLabels[outcome.kind]}提高 ${outcome.percentagePoints} 个百分点`;
    case 'outgoingDamageBoost':
      return `造成的伤害提高 ${outcome.percent}%`;
    case 'incomingDamageReduction':
      return `受到的伤害降低 ${outcome.percent}%`;
    case 'shield':
      return `获得相当于最大生命 ${outcome.maxHealthPercent}% 的护盾`;
    case 'heal':
      return `回复最大生命的 ${outcome.maxHealthPercent}%`;
    case 'guaranteedCriticalHit':
      return '100% 暴击';
  }
}

export function describePetCardBattleEffect(effect: PetCardBattleEffect): string {
  return `${triggerText(effect)}，${outcomeText(effect.outcome)}。`;
}
