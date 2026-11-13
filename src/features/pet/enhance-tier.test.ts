import { expect, it } from 'vitest';
import { enhanceTier } from './enhance-tier';

it('preserves the legacy enhancement tier boundaries without inventing invalid levels', () => {
  for (const [level, tier] of [
    [1, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [9, 3],
    [10, 4],
    [14, 4],
    [15, 5],
    [16, 5],
    [99, 5],
  ])
    expect(enhanceTier(level!)).toBe(tier);
  for (const level of [0, -1, 1.5, NaN, Infinity]) expect(enhanceTier(level)).toBe(0);
});
