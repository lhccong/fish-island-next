export function formatHeat(heat: number | null): string {
  if (heat === null) return '';
  if (heat === 0) return '置顶🔝';
  return heat >= 10000 ? `${(heat / 10000).toFixed(1)}万` : String(heat);
}

export function relativeUpdate(value: string | null, now = Date.now()): string {
  if (!value) return '未知';
  const seconds = Math.round((now - Date.parse(value)) / 1000);
  if (!Number.isFinite(seconds)) return '未知';
  if (Math.abs(seconds) < 60) return seconds >= 0 ? '几秒前' : '即将更新';
  const units = [
    [31536000, '年'],
    [2592000, '个月'],
    [86400, '天'],
    [3600, '小时'],
    [60, '分钟'],
  ] as const;
  for (const [size, unit] of units) {
    if (Math.abs(seconds) >= size)
      return `${Math.floor(Math.abs(seconds) / size)}${unit}${seconds >= 0 ? '前' : '后'}`;
  }
  return '刚刚';
}
