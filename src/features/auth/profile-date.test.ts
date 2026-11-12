import { expect, it } from 'vitest';
import { parseProfileDate, profileDate, profileDays } from './profile-date';

it('handles legacy Shanghai timestamps and elapsed whole days', () => {
  const date = parseProfileDate('2025-01-02 12:00:00')!;
  expect(date.toISOString()).toBe('2025-01-02T04:00:00.000Z');
  expect(profileDate(date)).toBe('2025年01月02日');
  expect(profileDays(date, Date.parse('2025-01-04T03:59:00Z'))).toBe(1);
  expect(parseProfileDate('invalid')).toBeNull();
  expect(parseProfileDate('')).toBeNull();
});
