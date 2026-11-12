import { describe, expect, test } from 'vitest';
import { builtinSkins } from './registry';
import { getSkinTokens } from './color-mode';

function luminance(hex: string) {
  const values = hex
    .slice(1)
    .match(/../g)!
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('independent color modes', () => {
  for (const skin of builtinSkins) {
    test(`${skin.id} preserves light colors and supplies readable dark surfaces and actions`, () => {
      const original = structuredClone(skin.tokens);
      expect(getSkinTokens(skin.id, 'light')).toEqual(original);
      const dark = getSkinTokens(skin.id, 'dark');
      expect(dark['--color-canvas']).toBe('#191a1c');
      expect(Object.keys(dark).sort()).toEqual(Object.keys(original).sort());
      for (const value of Object.values(dark)) expect(value).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(dark['--color-accent-text'], dark['--color-canvas'])).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(dark['--color-accent-text'], dark['--color-accent-soft']),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#ffffff', dark['--color-accent'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#e6e8eb', dark['--color-message-outgoing'])).toBeGreaterThanOrEqual(4.5);
      expect(skin.tokens).toEqual(original);
    });
  }
});
