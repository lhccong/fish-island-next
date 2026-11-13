const MiB = 1024 * 1024;
export async function prepareChatImage(file: File, signal: AbortSignal): Promise<File> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type))
    throw new Error('仅支持 PNG、JPEG、WebP、GIF 图片');
  if (!file.size || file.size > 10 * MiB) throw new Error('图片需在 10MB 以内且不能为空');
  signal.throwIfAborted();
  if (file.size <= MiB || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  try {
    signal.throwIfAborted();
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法处理图片，请尝试更小的图片');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.6, 0.4]) {
      signal.throwIfAborted();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', quality),
      );
      if (blob && blob.size <= MiB)
        return new File([blob], `pasted-image.${blob.type === 'image/webp' ? 'webp' : 'png'}`, {
          type: blob.type,
        });
    }
    throw new Error('图片压缩后仍过大，请缩小图片后粘贴');
  } finally {
    bitmap.close();
  }
}
