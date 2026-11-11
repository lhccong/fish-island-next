import { describe, expect, it } from 'vitest';
import { formatMomentTime } from './format-time';
describe('moment time presentation', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  it('formats recent times and does not expose raw ISO timestamps', () => {
    expect(formatMomentTime('2026-11-11T11:59:40Z', now)).toBe('刚刚');
    expect(formatMomentTime('2026-11-11T11:55:00Z', now)).toBe('5分钟前');
    expect(formatMomentTime('2026-11-11T10:00:00Z', now)).toBe('2小时前');
    expect(formatMomentTime('2026-11-09T12:00:00Z', now)).toBe('2天前');
    expect(formatMomentTime('2026-10-01T00:00:00Z', now)).toBe('2026-10-01 08:00');
  });
  it('handles unavailable and future timestamps', () => {
    expect(formatMomentTime('', now)).toBe('时间未知');
    expect(formatMomentTime('bad', now)).toBe('时间未知');
    expect(formatMomentTime('2026-11-12T00:00:00Z', now)).toBe('2026-11-12 08:00');
  });
});
