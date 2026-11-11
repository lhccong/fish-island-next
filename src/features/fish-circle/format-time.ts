const fullDate = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
export function formatMomentTime(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T'));
  if (!Number.isFinite(timestamp)) return '时间未知';
  const elapsed = now - timestamp;
  if (elapsed >= 0 && elapsed < 60000) return '刚刚';
  if (elapsed >= 60000 && elapsed < 3600000) return `${Math.floor(elapsed / 60000)}分钟前`;
  if (elapsed >= 3600000 && elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}小时前`;
  if (elapsed >= 86400000 && elapsed < 604800000) return `${Math.floor(elapsed / 86400000)}天前`;
  return fullDate.format(timestamp).replaceAll('/', '-');
}
