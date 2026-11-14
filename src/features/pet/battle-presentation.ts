import type { BattleResult, BattleRound } from '@/domain/pet';

export function battleOutcome(result: BattleResult, final: BattleRound | undefined) {
  if (result.win !== undefined) return result.win ? '挑战胜利' : '本次未获胜';
  if (final?.opponentHealth === 0 && final.selfHealth > 0) return '挑战胜利';
  if (final?.selfHealth === 0) return '本次未获胜';
  return '本轮挑战结束';
}
export function roundNarration(round: BattleRound, self: string, opponent: string) {
  const attacker = round.attacker === 'self' ? self : opponent;
  const defender = round.attacker === 'self' ? opponent : self;
  return round.dodge
    ? `${defender}闪避了${attacker}的攻击！`
    : `${attacker}${round.critical ? '打出暴击' : round.combo ? '发动连击' : '发动攻击'}！${round.block ? `${defender}格挡后` : ''}造成 ${round.damage} 伤害。${round.lifesteal ? `回复 ${round.lifesteal} 生命。` : ''}`;
}
