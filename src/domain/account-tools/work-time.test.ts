import { expect, it } from 'vitest';
import { defaultSchedule, isWorkDay, validSchedule } from './work-time';
it('validates times and income calculation inputs', () => {
  expect(validSchedule(defaultSchedule)).toBe(true);
  expect(validSchedule({ ...defaultSchedule, end: '00:00' })).toBe(false);
  expect(validSchedule({ ...defaultSchedule, start: '25:00' })).toBe(false);
  expect(validSchedule({ ...defaultSchedule, salary: NaN })).toBe(false);
  expect(validSchedule({ ...defaultSchedule, days: 1.5 })).toBe(false);
});
it('preserves the alternating Saturday schedule across week boundaries', () => {
  const schedule = { ...defaultSchedule, workdayType: 'mixed' as const, anchor: '2026-11-09' };
  expect(isWorkDay(new Date(2026, 10, 14), schedule)).toBe(true);
  expect(isWorkDay(new Date(2026, 10, 21), schedule)).toBe(false);
  expect(isWorkDay(new Date(2026, 10, 15), schedule)).toBe(false);
  expect(isWorkDay(new Date(2026, 10, 16), schedule)).toBe(true);
});
