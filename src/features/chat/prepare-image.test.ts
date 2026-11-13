import { afterEach, expect, it, vi } from 'vitest';
import { prepareChatImage } from './prepare-image';

afterEach(() => vi.unstubAllGlobals());
const file = (size = 300000) =>
  new File([new Uint8Array(size)], 'image.jpg', { type: 'image/jpeg' });
function canvasFixture(sizes: number[]) {
  const bitmap = { width: 2400, height: 1200, close: vi.fn() };
  const drawImage = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback) =>
    callback(new Blob([new Uint8Array(sizes.shift() ?? 100000)], { type: 'image/webp' })),
  );
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage }), toBlob }),
  });
  return { bitmap, toBlob, drawImage };
}
it('reduces resolution after quality attempts exceed the target budget', async () => {
  const { bitmap, drawImage } = canvasFixture([400000, 350000, 300000, 100000]);
  const result = await prepareChatImage(file(), new AbortController().signal);
  expect(result.size).toBe(100000);
  expect(result.name).toBe('pasted-image.webp');
  expect(drawImage).toHaveBeenLastCalledWith(bitmap, 0, 0, 1500, 750);
  expect(bitmap.close).toHaveBeenCalledOnce();
});
it('retains an already small original when encoding would increase bytes', async () => {
  const { bitmap } = canvasFixture([100000]);
  bitmap.width = 100;
  bitmap.height = 50;
  const original = file(1000);
  expect(await prepareChatImage(original, new AbortController().signal)).toBe(original);
});
it('stops after cancellation during encoding and releases the bitmap', async () => {
  const { bitmap, toBlob } = canvasFixture([]);
  const abort = new AbortController();
  toBlob.mockImplementation((callback) => {
    abort.abort();
    callback(new Blob(['encoded']));
  });
  await expect(prepareChatImage(file(), abort.signal)).rejects.toThrow();
  expect(toBlob).toHaveBeenCalledOnce();
  expect(bitmap.close).toHaveBeenCalledOnce();
});
it('does not decode oversized or animated GIF files', async () => {
  const decode = vi.fn();
  vi.stubGlobal('createImageBitmap', decode);
  const gif = new File(['GIF89a'], 'animation.gif', { type: 'image/gif' });
  expect(await prepareChatImage(gif, new AbortController().signal)).toBe(gif);
  await expect(
    prepareChatImage(file(11 * 1024 * 1024), new AbortController().signal),
  ).rejects.toThrow('10MB');
  expect(decode).not.toHaveBeenCalled();
});
