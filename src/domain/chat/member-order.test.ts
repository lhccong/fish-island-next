import { expect, test } from 'vitest';
import { sortMembersByLevel } from './member-order';

test('orders real levels descending, preserves ties and leaves the shared snapshot unchanged', () => {
  const members = Object.freeze([
    { id: 'unknown', name: '合成', avatar: null },
    { id: 'low', name: '合成', avatar: null, level: 1 },
    { id: 'high-first', name: '合成', avatar: null, level: 7 },
    { id: 'high-second', name: '合成', avatar: null, level: 7 },
    { id: 'zero', name: '合成', avatar: null, level: 0 },
  ]);
  expect(sortMembersByLevel(members).map((member) => member.id)).toEqual([
    'high-first',
    'high-second',
    'low',
    'zero',
    'unknown',
  ]);
  expect(members[0]!.id).toBe('unknown');
});
