import { describe, expect, test } from 'vitest';
import { check } from './condition';
import { end, next, start, summary } from './core.game';
import type { ProfileState } from './core.state';
import { finishCultivation, startCultivation } from './cultivation';
import { nextCultivation } from './cultivation.advance';
import { achievements, ages, characters, events, talents } from './data';

const fresh = (): ProfileState => ({
  times: 0,
  talents: new Set(),
  events: new Set(),
  achievements: new Set(),
});
const allocation = { charm: 4, intelligence: 4, strength: 4, money: 4, spirit: 4 };
function seeded(seed: number) {
  return (max = 1, min = 0) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return min + Math.floor((seed / 4294967296) * (max - min + 1));
  };
}
describe('complete migrated game flows', () => {
  test('all age pools and branches retain resolvable original IDs', () => {
    expect(events.size).toBeGreaterThan(1000);
    expect(talents.size).toBeGreaterThan(100);
    expect(characters.size).toBeGreaterThan(10);
    expect(achievements.size).toBeGreaterThan(100);
    for (const age of ages.values())
      for (const level of age.event) for (const [id] of level) expect(events.has(id)).toBe(true);
    for (const event of events.values())
      for (const branch of event.branch ?? []) expect(events.has(branch.event)).toBe(true);
  });
  test.each([1, 21, 222, 3001])(
    'classic run %s reaches summary and persists a new profile without mutating prior state',
    (seed) => {
      const profile = fresh(),
        rng = seeded(seed);
      const initial = start(profile, allocation, new Set());
      let state = initial.state;
      for (let year = 0; year < 500 && state.life > 0; year++)
        state = next(state, profile, rng).state;
      expect(state.life).toBeLessThanOrEqual(0);
      expect(initial.state.props.current.age).toBe(-1);
      expect(initial.state.events.size).toBe(0);
      const result = summary(state, profile);
      expect(Number.isFinite(result.summary)).toBe(true);
      const finished = end(result.state, profile, [1001]).profile;
      expect(finished.times).toBe(1);
      expect(finished.locked).toEqual([1001]);
      expect(finished.events.size).toBeGreaterThan(0);
      expect(profile.times).toBe(0);
    },
  );
  test.each([1, 200])(
    'cultivation run %s reaches an ending and records its realm and events',
    (seed) => {
      const profile = fresh(),
        rng = seeded(seed);
      const initial = startCultivation(profile, allocation, [1, 2, 3], rng);
      let state = initial.state;
      for (let turn = 0; turn < 1801 && !state.cultivation.ending; turn++)
        state = nextCultivation(state, profile, rng).state;
      expect(state.cultivation.ending).toBeTruthy();
      const finished = finishCultivation(state, profile);
      expect(finished.cultivation?.times).toBe(1);
      expect(finished.cultivation?.events?.length).toBeGreaterThan(0);
      expect(profile.cultivation).toBeUndefined();
    },
  );
  test('nested conditions preserve collection membership and numeric comparisons', () => {
    const state = { AGE: 30, EVT: new Set([900127]), TMS: 10 };
    expect(check(state, '(AGE>=18)&(EVT?[900127])')).toBe(true);
    expect(check(state, '(AGE<18)|(TMS<10)')).toBe(false);
    expect(check(state, 'EVT![900127]')).toBe(false);
  });
});
