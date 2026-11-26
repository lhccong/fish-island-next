import { describe, expect, it } from 'vitest';
import { isTodoDate, shiftTodoMonth, todoMonthDays } from '@/domain/todo';
import { decodeTodoSnapshot } from './snapshot';

const task = {
  id: 1,
  title: '旧任务',
  date: '2024-02-29',
  priority: 'high',
  status: 'pending',
  note: '旧备注',
  bgColor: 'rgb(255, 240, 240)',
} as const;

describe('legacy todo snapshots', () => {
  it('preserves weekly and unrecognized data and fields through edits and deletion', () => {
    const old = { ...task, extension: { saved: true } };
    const weekly = { ...task, type: 'weekly', startDate: task.date };
    const unknown = { id: 3, format: 'future' };
    const snapshot = decodeTodoSnapshot(JSON.stringify([weekly, old, unknown]));
    expect(snapshot.tasks).toEqual([task]);
    expect(snapshot.encode([{ ...task, status: 'completed' }])).toEqual([
      weekly,
      { ...old, status: 'completed' },
      unknown,
    ]);
    expect(snapshot.encode([])).toEqual([weekly, unknown]);
    expect(decodeTodoSnapshot([task]).encode([])).toEqual([]);
  });

  it('accepts both server empty shapes and rejects an unsafe snapshot', () => {
    for (const empty of [null, 'null', '[]']) {
      expect(decodeTodoSnapshot(empty).tasks).toEqual([]);
    }
    expect(() => decodeTodoSnapshot('[not-json]')).toThrow();
    expect(() => decodeTodoSnapshot('{}')).toThrow();
    expect(() => decodeTodoSnapshot([task, task])).toThrow();
  });
});

it('handles leap days, final days and year changes in the month grid', () => {
  expect(isTodoDate('2024-02-29')).toBe(true);
  expect(isTodoDate('2026-02-29')).toBe(false);
  expect(shiftTodoMonth('2026-12-31', 1)).toBe('2027-01-01');
  expect(todoMonthDays('2026-11-26').slice(0, 7)).toEqual([
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-11-01',
  ]);
  expect(todoMonthDays('2024-02-01').at(-1)).toBe('2024-02-29');
  expect(todoMonthDays('9999-12-01').at(-1)).toBe('9999-12-31');
});
