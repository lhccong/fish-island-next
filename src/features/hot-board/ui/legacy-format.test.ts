import { expect, it } from 'vitest';
import { formatHeat, relativeUpdate } from './legacy-format';

it('preserves the legacy heat display including pinned and unavailable values', () => {
  expect([null, 0, 9999, 10000, 123456].map(formatHeat)).toEqual([
    '',
    '置顶🔝',
    '9999',
    '1.0万',
    '12.3万',
  ]);
});

it('formats actual source update time and handles missing dates', () => {
  const updated = '2026-11-11T10:00:00+08:00';
  expect(relativeUpdate(updated, Date.parse(updated) + 300000)).toBe('5分钟前');
  expect(relativeUpdate(updated, Date.parse(updated) + 10000)).toBe('几秒前');
  expect(relativeUpdate(null)).toBe('未知');
  expect(relativeUpdate('invalid')).toBe('未知');
});
