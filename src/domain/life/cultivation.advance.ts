import type { ProfileState } from './core.state';
import { propsEffect } from './core.state';
import {
  cultivationEventPool,
  cultivationEvents,
  formatCultivationEvent,
} from './cultivation.event';
import { produce } from './produce';
import { pickWeight, random, type RNG } from './vitex';

import type {
  CultivationGame,
  CultivationLog,
  CultivationResult,
  CultivationState,
} from './cultivation';
import {
  breakthroughChance,
  finalize,
  lifespan,
  realmLabel,
  realms,
  requiredProgress,
  roots,
  selectedTalents,
  tribulationChance,
} from './cultivation';
export function nextCultivation(
  state: CultivationGame,
  profile: ProfileState,
  rng?: RNG,
): CultivationResult {
  if (state.life <= 0 || state.cultivation.ending) return { state, logs: [], achievements: [] };
  const logs: CultivationLog[] = [];
  const updated = produce(state, (draft) => {
    const c = draft.cultivation;
    const currentRealm = realms[c.realm]!;
    const previousAge = draft.props.current.age;
    const limit = lifespan(state);
    let years = currentRealm.years;
    if (limit !== null) years = Math.min(years, limit - previousAge);
    if (c.nextTribulation !== null) years = Math.min(years, c.nextTribulation - previousAge);
    years = Math.max(0, years);
    draft.props = propsEffect(draft.props, { age: years });
    c.turns++;
    const age = draft.props.current.age;
    const log = (eventId: number) => {
      const event = cultivationEvents.get(eventId)!;
      draft.events.add(eventId);
      logs.push({
        age,
        eventId,
        kind: event.kind,
        text: formatCultivationEvent(eventId, {
          realm: realmLabel(c),
          root: roots[c.root]!.name,
          lifespan: lifespan(draft) ?? '无限',
          years,
        }),
      });
    };
    const end = (ending: NonNullable<CultivationState['ending']>, eventId: number) => {
      c.ending = ending;
      draft.life = 0;
      log(eventId);
    };
    if (limit !== null && age >= limit) {
      end('lifespan', 910024);
      return;
    }
    // An explicit terminal guard keeps even an unlucky immortal run finite.
    if (c.turns >= 1800) {
      end('seclusion', 910025);
      return;
    }
    if (c.realm === 0) {
      c.progress = age;
      if (age < 6) {
        log(random(1, 0, rng) === 0 ? 910028 : 910029);
        return;
      }
      c.realm = 1;
      c.progress = 0;
      log(910001);
      return;
    }
    if (c.nextTribulation !== null && age >= c.nextTribulation) {
      if (random(99, 0, rng) >= tribulationChance(draft)) {
        end('tribulation', 910021);
        return;
      }
      c.tribulations++;
      c.nextTribulation += c.realm >= 9 ? 10000 : 3000;
      log(910020);
    }

    const p = draft.props.current;
    const bonus = selectedTalents(draft).reduce((sum, talent) => sum + (talent.training || 0), 0);
    const rate =
      roots[c.root]!.rate *
      (0.65 + Math.max(0, p.intelligence) * 0.07 + Math.max(0, p.strength) * 0.025) *
      (1 + bonus);
    let gain = (years * rate * random(85, 65, rng)) / 100;
    const eventId = pickWeight(cultivationEventPool(c.realm, p.charm, draft.events, age), rng);
    if (eventId === null) throw new Error('No cultivation encounter available');
    const encounter = cultivationEvents.get(eventId)!;
    if (encounter.fatal) {
      end('encounter', eventId);
      return;
    }
    gain *= encounter.trainingFactor ?? 1;
    draft.props = propsEffect(draft.props, encounter.effect || {});
    log(eventId);
    const required = requiredProgress(c);
    c.progress = Math.min(required, c.progress + Math.max(0.1, gain));
    if (c.progress < required) return;
    const major = c.stage === currentRealm.stages - 1;
    const chance = major ? breakthroughChance(draft) : Math.min(98, breakthroughChance(draft) + 18);
    if (random(99, 0, rng) >= chance) {
      c.progress = required * 0.65;
      c.failures++;
      log(910026);
      return;
    }
    if (major && c.realm >= 8) {
      if (random(99, 0, rng) >= tribulationChance(draft)) {
        end('tribulation', c.realm === 8 ? 910022 : 910023);
        return;
      }
      c.tribulations++;
      log(910020);
    }
    c.progress = 0;
    c.failures = 0;
    if (!major) {
      c.stage++;
      log(910027);
      return;
    }
    c.realm++;
    c.stage = 0;
    draft.props = propsEffect(draft.props, { intelligence: 1, strength: 2, spirit: 1 });
    if (c.realm === 6) c.nextTribulation = age + 3000;
    if (c.realm === 9) c.nextTribulation = age + 10000;
    if (c.realm === 13) {
      end('dao', 910013);
      return;
    }
    log(910000 + c.realm);
  });
  return finalize(updated, profile, logs);
}
