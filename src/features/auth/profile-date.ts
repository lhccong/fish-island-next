export function parseProfileDate(value: string): Date | null {
  const normalized = value.trim().replace(' ', 'T');
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T00:00:00+08:00`
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)
        ? `${normalized}+08:00`
        : normalized,
  );
  return Number.isFinite(date.getTime()) ? date : null;
}
export function profileDate(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  })
    .format(value)
    .replace(/\//g, '-')
    .replace(/^(\d+)-(\d+)-(\d+)$/, '$1年$2月$3日');
}
export function profileDays(value: Date, now = Date.now()): number {
  return Math.floor((now - value.getTime()) / 86400000);
}
