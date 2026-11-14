import { expect, test } from 'vitest';
import { readTabImage } from './tab-image';

test('rejects oversized files and files disguised as images before decoding', async () => {
  await expect(
    readTabImage(new File([new Uint8Array(256 * 1024 + 1)], 'large.png', { type: 'image/png' })),
  ).rejects.toThrow('不能超过 256 KB');
  await expect(
    readTabImage(new File(['<svg></svg>'], 'icon.png', { type: 'image/png' })),
  ).rejects.toThrow('请选择 PNG');
});
