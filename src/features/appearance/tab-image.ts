export function checkTabImage(src: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('已取消'));
      return;
    }
    const image = new Image();
    const finish = (error?: string) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      image.onload = null;
      image.onerror = null;
      if (error) reject(new Error(error));
      else resolve();
    };
    const timer = setTimeout(() => finish('图标加载超时，请检查地址或选择本地图片。'), 8000);
    const cancel = () => {
      finish('已取消');
      image.src = '';
    };
    signal?.addEventListener('abort', cancel, { once: true });
    image.onload = () => finish();
    image.onerror = () => finish('图标无法加载，请更换图片或地址。');
    image.src = src;
  });
}

export async function readTabImage(file: File, signal?: AbortSignal): Promise<string> {
  if (file.size > 256 * 1024) throw new Error('图片不能超过 256 KB，请选择较小的图标。');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (bytes: number[], offset = 0) =>
    bytes.every((byte, index) => header[index + offset] === byte);
  const type = matches([137, 80, 78, 71, 13, 10, 26, 10])
    ? 'image/png'
    : matches([255, 216, 255])
      ? 'image/jpeg'
      : matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8)
        ? 'image/webp'
        : matches([0, 0, 1, 0])
          ? 'image/x-icon'
          : null;
  if (!type) throw new Error('请选择 PNG、JPEG、WebP 或 ICO 图片。');
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'));
    reader.readAsDataURL(new Blob([file], { type }));
  });
  await checkTabImage(src, signal);
  return src;
}
