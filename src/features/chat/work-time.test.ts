import { describe, expect, it } from 'vitest';
import { buildConversationEntries } from './camouflage-conversations';
import { formatWorkTime, withWorkTimes } from './work-time';

describe('local camouflage times', () => {
  const referenceAt = new Date(2026, 10, 17, 11, 37).getTime();

  it('uses calendar boundaries for today, yesterday, weekday and older dates', () => {
    expect(formatWorkTime(new Date(2026, 10, 17, 10, 3).getTime(), referenceAt)).toBe('10:03');
    expect(formatWorkTime(new Date(2026, 10, 16, 23, 59).getTime(), referenceAt)).toBe('昨天');
    expect(formatWorkTime(new Date(2026, 10, 15, 12).getTime(), referenceAt)).toBe('周日');
    expect(formatWorkTime(new Date(2026, 9, 31, 12).getTime(), referenceAt)).toBe('10/31');
    expect(
      formatWorkTime(
        new Date(2025, 11, 31, 23, 59).getTime(),
        new Date(2026, 0, 1, 0, 1).getTime(),
      ),
    ).toBe('昨天');
  });

  it('keeps source order and stable, varied times without modifying member data', () => {
    const members = Array.from({ length: 40 }, (_, index) => ({
      id: `synthetic-${index}`,
      name: `合成成员${index}`,
      avatar: '',
    }));
    const entries = buildConversationEntries(members);
    const timed = withWorkTimes(entries, referenceAt);
    expect(timed.map(({ id }) => id)).toEqual(entries.map(({ id }) => id));
    expect(new Set(timed.slice(0, 8).map(({ time }) => time)).size).toBe(8);
    expect(timed.some(({ time }) => time === '昨天')).toBe(true);
    expect(timed.some(({ time }) => /^周/.test(time))).toBe(true);
    expect(timed.some(({ time }) => /^\d{2}\/\d{2}$/.test(time))).toBe(true);
    expect(withWorkTimes(entries, referenceAt)).toEqual(timed);
    expect(entries.every((entry) => !Object.hasOwn(entry, 'time'))).toBe(true);
  });
});
