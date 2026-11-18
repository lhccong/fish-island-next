import { expect, it } from 'vitest';
import calendar from './2027-holidays.json';
import { getHolidayCountdown } from './holiday';

it('keeps the seven official holiday ranges and five makeup workdays in a sourced local calendar', () => {
  expect(calendar.holidays.map(({ name, start, end }) => [name, start, end])).toEqual([
    ['元旦', '2027-01-01', '2027-01-03'],
    ['春节', '2027-02-05', '2027-02-13'],
    ['清明节', '2027-04-03', '2027-04-05'],
    ['劳动节', '2027-05-01', '2027-05-05'],
    ['端午节', '2027-06-09', '2027-06-09'],
    ['中秋节', '2027-09-15', '2027-09-15'],
    ['国庆节', '2027-10-01', '2027-10-07'],
  ]);
  expect(calendar.workdays).toEqual([
    '2027-01-31',
    '2027-02-14',
    '2027-05-08',
    '2027-09-26',
    '2027-10-09',
  ]);
  expect(calendar.timeZone).toBe('Asia/Shanghai');
  expect(calendar.source.url).toContain('mohrss.gov.cn');
});

it.each([
  ['2026-12-30T00:00:00+08:00', '元旦', '还有 2 天'],
  ['2026-12-31T23:59:58+08:00', '元旦', '还有 00:00:02'],
  ['2027-01-01T00:00:00+08:00', '元旦', '假期进行中 🎉'],
  ['2027-01-03T23:59:59+08:00', '元旦', '假期进行中 🎉'],
  ['2027-01-04T00:00:00+08:00', '春节', '还有 32 天'],
  ['2027-01-31T00:00:00+08:00', '春节', '还有 5 天'],
  ['2027-02-13T23:59:59+08:00', '春节', '假期进行中 🎉'],
  ['2027-06-09T23:59:59+08:00', '端午节', '假期进行中 🎉'],
  ['2027-06-10T00:00:00+08:00', '中秋节', '还有 97 天'],
  ['2027-09-30T16:00:00Z', '国庆节', '假期进行中 🎉'],
])('calculates the next/active holiday at %s', (date, name, remaining) => {
  expect(getHolidayCountdown(new Date(date))).toMatchObject({ name, remaining });
});

it('shows inclusive leave duration and handles expired years without inventing holidays', () => {
  expect(getHolidayCountdown(new Date('2027-02-05T00:00:00+08:00'))?.dates).toBe(
    '2027年02月05日 至 02月13日 · 9天',
  );
  expect(getHolidayCountdown(new Date('2027-06-09T00:00:00+08:00'))?.dates).toBe(
    '2027年06月09日 · 1天',
  );
  expect(getHolidayCountdown(new Date('2027-10-08T00:00:00+08:00'))).toBeNull();
  expect(getHolidayCountdown(new Date('2028-01-01T00:00:00+08:00'))).toBeNull();
});
