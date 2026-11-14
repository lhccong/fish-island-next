import { expect, it } from 'vitest';
import { titleAsset } from './title-assets';

const artwork = import.meta.glob('/public/assets/chat-titles/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

it('maps every supported level and CSS title to self-contained local SVG artwork', () => {
  for (const id of ['-1', ...Array.from({ length: 12 }, (_, i) => String(i + 1)), '25']) {
    const asset = titleAsset(id, 0)!;
    expect(asset.remote).toBe(false);
    const svg = artwork[`/public${asset.src}`] as string;
    expect(svg).toContain(`<title>${asset.name}</title>`);
    expect(svg).toContain('prefers-reduced-motion:reduce');
    expect(svg).not.toMatch(/<script|<image|<foreignObject|https?:\/\/[^w]/);
  }
  for (const level of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17]) {
    const asset = titleAsset('0', level)!;
    expect(artwork[`/public${asset.src}`]).toContain(`<title>${asset.name}</title>`);
  }
  expect(titleAsset('0', 12)?.name).toBe('摸鱼祖师');
  expect(titleAsset('0', 17)?.name).toBe('摸鱼皇帝');
  expect(titleAsset('0', 3)).toMatchObject({ width: 61.2, height: 11.05 });
  expect(titleAsset('0', 5)).toMatchObject({ width: 61.2, height: 11.05 });
  expect(titleAsset('12', 1)).toMatchObject({ width: 72.25, height: 11.05 });
  expect(titleAsset('24', 1)).toMatchObject({ width: 63.28, height: 14 });
});

it('uses only trusted HTTPS image entries and never accepts message URLs or prototype keys', () => {
  for (let id = 13; id <= 41; id++) {
    if (id === 25) continue;
    const asset = titleAsset(String(id), undefined)!;
    expect(asset.remote).toBe(true);
    expect(new URL(asset.src).origin).toBe('https://oss.cqbo.com');
  }
  for (const id of ['toString', '__proto__', '999', 'https://untrusted.test/a.svg'])
    expect(titleAsset(id, 7)).toBeUndefined();
  for (const level of [undefined, -1, 13, 18, 0.5, NaN])
    expect(titleAsset('0', level)).toBeUndefined();
});
