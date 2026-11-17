import { expect, it } from 'vitest';
import { formatNextRenameTime, parseProfileDate, profileDate, profileDays } from './profile-date';

it('handles legacy Shanghai timestamps and elapsed whole days', () => {
  const date = parseProfileDate('2025-01-02 12:00:00')!;
  expect(date.toISOString()).toBe('2025-01-02T04:00:00.000Z');
  expect(profileDate(date)).toBe('2025年01月02日');
  expect(profileDays(date, Date.parse('2025-01-04T03:59:00Z'))).toBe(1);
  expect(parseProfileDate('invalid')).toBeNull();
  expect(parseProfileDate('')).toBeNull();
});

it('shows the server rename boundary in Beijing time and handles available or unknown states', () => {
  const now = Date.parse('2026-12-31T15:59:00Z');
  expect(formatNextRenameTime('2027-01-01T00:00:00+08:00', now)).toBe(
    '2027-01-01 00:00（北京时间）',
  );
  expect(formatNextRenameTime('2026-12-31T16:00:00Z', now)).toBe('2027-01-01 00:00（北京时间）');
  expect(formatNextRenameTime('2027-01-01T00:00:00+08:00', now + 60_000)).toBe('现在可修改');
  expect(formatNextRenameTime(null, now)).toBe('现在可修改');
  expect(formatNextRenameTime(undefined, now)).toBe('暂无法获取');
  expect(formatNextRenameTime('invalid', now)).toBe('暂无法获取');
});
