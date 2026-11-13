import { expect, it } from 'vitest';
import { isAnimatedImage } from './animated-image';

it('detects APNG and WebP animation chunks without matching marker text inside data', async () => {
  const png = new Uint8Array(20);
  png.set(new TextEncoder().encode('acTL'), 12);
  expect(await isAnimatedImage(new File([png], 'animation.png', { type: 'image/png' }))).toBe(true);
  const webp = new Uint8Array(20);
  webp.set(new TextEncoder().encode('ANIM'), 12);
  expect(await isAnimatedImage(new File([webp], 'animation.webp', { type: 'image/webp' }))).toBe(
    true,
  );
  const staticPng = new Uint8Array(24);
  new DataView(staticPng.buffer).setUint32(8, 4);
  staticPng.set(new TextEncoder().encode('IDATacTL'), 12);
  expect(await isAnimatedImage(new File([staticPng], 'still.png', { type: 'image/png' }))).toBe(
    false,
  );
});
