// PNG/WebP chunk boundaries avoid matching animation markers inside pixel data.
export async function isAnimatedImage(file: File): Promise<boolean> {
  if (file.type === 'image/gif') return true;
  if (file.type !== 'image/png' && file.type !== 'image/webp') return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const png = file.type === 'image/png';
  let offset = png ? 8 : 12;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset + (png ? 0 : 4), !png);
    const nameAt = offset + (png ? 4 : 0);
    const name = String.fromCharCode(...bytes.subarray(nameAt, nameAt + 4));
    if ((png && name === 'acTL') || (!png && name === 'ANIM')) return true;
    offset += png ? length + 12 : 8 + length + (length % 2);
  }
  return false;
}
