import { describe, expect, it } from 'vitest';
import { createImageGeometry } from './image-geometry';

describe('account image geometry', () => {
  it('keeps only valid intrinsic proportions within a bounded account cache', () => {
    const geometry = createImageGeometry();
    geometry.remember('wide', 1200, 160);
    geometry.remember('tall', 160, 900);
    geometry.remember('wide', 0, 100);
    geometry.remember('invalid', Number.POSITIVE_INFINITY, 100);
    geometry.remember('invalid', 100, 0);
    expect(geometry.read('wide')).toBe(7.5);
    expect(geometry.read('tall')).toBe(160 / 900);
    expect(geometry.read('invalid')).toBeNull();
    for (let i = 0; i < 998; i++) geometry.remember(`image-${i}`, 320, 240);
    geometry.remember('wide', 640, 360);
    geometry.remember('new', 1, 1);
    expect(geometry.read('tall')).toBeNull();
    expect(geometry.read('wide')).toBe(640 / 360);
    expect(createImageGeometry().read('wide')).toBeNull();
  });
});
