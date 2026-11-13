import { describe, expect, it } from 'vitest';
import { formatPetNumber, formatPetStat } from './format-stat';

describe('pet stat presentation', () => {
  it('converts ratios to percentages and removes floating point tails', () => {
    expect(formatPetStat('暴击率', 0.14920000000000003)).toBe('14.92%');
    expect(formatPetStat('暴击抵抗', 0.12000000000000001)).toBe('12%');
    expect(formatPetStat('连击抵抗', 0.15300000000000002)).toBe('15.3%');
    for (const label of [
      '闪避率',
      '格挡率',
      '连击率',
      '生命汲取',
      '闪避抵抗',
      '格挡抵抗',
      '汲取抵抗',
    ])
      expect(formatPetStat(label, 0.0192, true)).toBe('+1.92%');
  });
  it('keeps flat attributes and already-percent success chances in their original units', () => {
    expect(formatPetStat('攻击', 555.00000000001)).toBe('555');
    expect(formatPetStat('速度', 32, true)).toBe('+32');
    expect(formatPetStat('生命汲取', -0.0192, true)).toBe('-1.92%');
    expect(formatPetStat('暴击率', 0)).toBe('0%');
    expect(formatPetStat('生命汲取', 1.25)).toBe('125%');
    expect(formatPetNumber(1.0000000000002)).toBe('1');
  });
});
