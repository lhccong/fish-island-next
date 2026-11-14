import { describe, expect, it } from 'vitest';
import { battleOutcome, roundNarration } from './battle-presentation';
import type { BattleRound } from '@/domain/pet';

const final: BattleRound = {
  attacker: 'self',
  damage: 10,
  selfHealth: 80,
  opponentHealth: 0,
  critical: false,
  dodge: false,
  block: false,
};
describe('authoritative battle presentation', () => {
  it('uses explicit server outcomes even when remaining health implies otherwise', () => {
    expect(battleOutcome({ rounds: [final], win: false }, final)).toBe('本次未获胜');
    expect(battleOutcome({ rounds: [final], win: true }, { ...final, opponentHealth: 30 })).toBe(
      '挑战胜利',
    );
    expect(battleOutcome({ rounds: [final] }, final)).toBe('挑战胜利');
    expect(battleOutcome({ rounds: [] }, undefined)).toBe('本轮挑战结束');
    expect(battleOutcome({ rounds: [final] }, { ...final, selfHealth: 0, opponentHealth: 0 })).toBe(
      '本次未获胜',
    );
  });
  it('describes dodge and block without inventing skills or damage', () => {
    expect(roundNarration({ ...final, dodge: true }, '小苔', '守卫')).toBe(
      '守卫闪避了小苔的攻击！',
    );
    expect(roundNarration({ ...final, critical: true, block: true }, '小苔', '守卫')).toContain(
      '小苔打出暴击！守卫格挡后造成 10 伤害',
    );
  });
});
