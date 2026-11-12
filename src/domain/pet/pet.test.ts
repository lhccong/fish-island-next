import { describe, expect, it } from 'vitest';
import { boundedPercent, campPosition } from './index';
describe('camp movement and display bounds', () => {
  it('keeps partners within the walkable clearing', () => {
    expect(campPosition(-40, 150)).toEqual({ x: 16, y: 80 });
    expect(campPosition(200, -15)).toEqual({ x: 84, y: 32 });
    expect(campPosition(50, 55)).toEqual({ x: 50, y: 55 });
  });
  it('bounds progress display without changing server values', () => {
    expect(boundedPercent(-1)).toBe(0);
    expect(boundedPercent(150)).toBe(100);
  });
});
