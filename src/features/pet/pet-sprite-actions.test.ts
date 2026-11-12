import { expect, test } from 'vitest';
import { petSpriteAction } from './pet-sprite-actions';

test('keeps the two inspected resource direction orders independent', () => {
  expect(petSpriteAction('/moyu/pet/luobo.webp', 'run-left').row).toBe(2);
  expect(petSpriteAction('/moyu/pet/luobo.webp', 'run').row).toBe(1);
  expect(petSpriteAction('/moyu/pet/wutiaowu.webp', 'run-left').row).toBe(1);
  expect(petSpriteAction('/moyu/pet/wutiaowu.webp', 'run').row).toBe(2);
});
test('preserves resource mappings across CDN directories and query parameters', () => {
  expect(petSpriteAction('https://cdn.test/assets/wutiaowu.webp?v=2#image', 'run-left')).toEqual({
    row: 1,
    frames: 8,
  });
  expect(petSpriteAction('/assets/luobo.webp?v=2', 'idle')).toEqual({ row: 0, frames: 6 });
  expect(petSpriteAction('/assets/luobo.webp', 'pat')).toEqual({ row: 3, frames: 4 });
});
