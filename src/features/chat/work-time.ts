import type { ChatListEntry } from './camouflage-conversations';

const clock = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });
const date = new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' });

function calendarDay(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000;
}

export function formatWorkTime(timestamp: number, referenceAt: number): string {
  const value = new Date(timestamp);
  const days = calendarDay(new Date(referenceAt)) - calendarDay(value);
  if (days === 0) return clock.format(value);
  if (days === 1) return '昨天';
  if (days < 7) return weekday.format(value);
  return date.format(value);
}

// Presentation only: keep the member order and calculate before search filtering.
export function withWorkTimes(entries: readonly ChatListEntry[], referenceAt: number) {
  let minutes = 0;
  return entries.map((entry, index) => {
    let hash = 0;
    for (const character of `${entry.kind}:${entry.id}`)
      hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
    minutes += 3 + index * 12 + (hash % 17);
    return { ...entry, time: formatWorkTime(referenceAt - minutes * 60000, referenceAt) };
  });
}
