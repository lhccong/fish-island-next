export function createImageGeometry() {
  const ratios = new Map<string, number>();
  return {
    read: (url: string) => ratios.get(url) ?? null,
    remember(url: string, width: number, height: number) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      const ratio = width / height;
      if (!Number.isFinite(ratio) || ratio <= 0) return;
      ratios.delete(url);
      ratios.set(url, ratio);
      if (ratios.size > 1000) ratios.delete(ratios.keys().next().value!);
    },
  };
}
export type ImageGeometry = ReturnType<typeof createImageGeometry>;
