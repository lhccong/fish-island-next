import { isAnimatedImage } from './animated-image';

const MiB = 1024 * 1024;
const targetBytes = 256 * 1024;
export async function prepareChatImage(file: File, signal: AbortSignal): Promise<File> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type))
    throw new Error('仅支持 PNG、JPEG、WebP、GIF 图片');
  if (!file.size || file.size > 10 * MiB) throw new Error('图片需在 10MB 以内且不能为空');
  signal.throwIfAborted();
  if (await isAnimatedImage(file)) {
    signal.throwIfAborted();
    return file;
  }
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('图片无法读取，请重新选择或复制有效图片');
  });
  try {
    signal.throwIfAborted();
    let scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法处理图片，请尝试更小的图片');
    while (true) {
      signal.throwIfAborted();
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        signal.throwIfAborted();
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/webp', quality),
        );
        signal.throwIfAborted();
        if (!blob) throw new Error('图片压缩失败，请重试');
        if (blob.size <= targetBytes) {
          if (scale === 1 && blob.size >= file.size && file.size <= targetBytes) return file;
          return new File([blob], `pasted-image.${blob.type === 'image/webp' ? 'webp' : 'png'}`, {
            type: blob.type,
          });
        }
        if (scale === 1 && file.size <= targetBytes) return file;
      }
      const longest = Math.max(canvas.width, canvas.height);
      if (longest <= 320) break;
      scale *= Math.max(320 / longest, 0.75);
    }
    throw new Error('图片压缩后仍过大，请缩小图片后重试');
  } finally {
    bitmap.close();
  }
}
