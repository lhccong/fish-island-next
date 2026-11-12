import { describe, expect, it } from 'vitest';
import { normalizeGroupName } from './use-local-group-name';

describe('local group name rules', () => {
  it('trims names and counts Unicode characters rather than UTF-16 units', () => {
    expect(normalizeGroupName('  茶话会  ')).toBe('茶话会');
    expect(normalizeGroupName('🐟'.repeat(30))).toBe('🐟'.repeat(30));
  });
  it('rejects empty names, control characters and overlong names', () => {
    for (const name of ['', '   ', '群\n聊', '群\t聊', '鱼'.repeat(31), '🐟'.repeat(31)])
      expect(() => normalizeGroupName(name)).toThrow();
  });
});
