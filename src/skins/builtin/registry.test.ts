import { describe, expect, it } from 'vitest';
import { builtinSkins, getBuiltinSkin } from './registry';

describe('built-in skin contracts', () => {
  it('keeps identifiers unique and resolvable', () => {
    expect(new Set(builtinSkins.map((skin) => skin.id)).size).toBe(builtinSkins.length);
    for (const skin of builtinSkins) expect(getBuiltinSkin(skin.id)).toBe(skin);
  });
  it('gives every skin the supported token set and valid hex colors', () => {
    for (const skin of builtinSkins) {
      expect(Object.keys(skin.tokens).sort()).toEqual([
        '--color-accent',
        '--color-accent-soft',
        '--color-accent-text',
        '--color-message-outgoing',
        '--color-rail',
        '--color-selected-muted',
        '--color-sidebar',
      ]);
      for (const color of Object.values(skin.tokens)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
