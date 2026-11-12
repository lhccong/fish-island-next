import { describe, expect, it } from 'vitest';
import { advanceCamp, heldDirection, movementKey } from './camp-movement';

describe('camp movement direction', () => {
  it('recognizes WASD, uppercase letters, physical codes and arrows', () => {
    expect(movementKey('w', 'KeyW')).toBe('KeyW');
    expect(movementKey('A', '')).toBe('KeyA');
    expect(movementKey('ArrowRight', '')).toBe('ArrowRight');
    expect(movementKey('q', 'KeyQ')).toBeNull();
  });
  it('normalizes diagonal movement and cancels opposite keys', () => {
    const diagonal = heldDirection(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.x).toBeGreaterThan(0);
    expect(diagonal.y).toBeLessThan(0);
    expect(heldDirection(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 });
    expect(heldDirection(new Set(['KeyW', 'KeyD', 'ArrowRight']))).toEqual(diagonal);
  });
  it('faces the actual displacement when redirecting before arrival', () => {
    const actual = { x: 52, y: 60 };
    const step = advanceCamp(actual, { x: 1, y: 0 }, 1, 'run-left');
    expect(step.position.x).toBe(53);
    expect(step.facing).toBe('run');
    expect(advanceCamp(actual, { x: -1, y: 0 }, 1, 'run').facing).toBe('run-left');
  });
  it('does not animate running into a boundary and preserves vertical facing', () => {
    expect(advanceCamp({ x: 16, y: 60 }, { x: -1, y: 0 }, 1, 'run-left').moving).toBe(false);
    expect(advanceCamp({ x: 40, y: 60 }, { x: 0, y: -1 }, 1, 'run-left').facing).toBe('run-left');
  });
});
