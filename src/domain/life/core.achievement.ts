import type { Achievement, AchievementOpportunity } from './data';
import { achievements } from './data';
import type { GameState, ProfileState } from './core.state';
import { createFlatState } from './core.state';
import { check } from './condition';
import { produce } from './produce';
import type { TriggerResult } from './core.game';

const OpportunityMap = new Map<AchievementOpportunity, number[]>();
for (const achievement of achievements.values()) {
  const list = OpportunityMap.get(achievement.opportunity) || [];
  list.push(achievement.id);
  OpportunityMap.set(achievement.opportunity, list);
}

export function trigger(
  opportunity: AchievementOpportunity,
  state: GameState,
  profile: ProfileState,
  allowed?: (id: Achievement['id']) => boolean,
): TriggerResult<Achievement['id']> {
  const flatState = createFlatState(state, profile);
  const triggers = OpportunityMap.get(opportunity)!.filter((a) => {
    if (allowed && !allowed(a)) return false;
    if (state.achievements.has(a)) return false;
    if (profile.achievements.has(a)) return false;
    const { condition } = achievements.get(a)!;
    return check(flatState, condition);
  });
  const newState = produce(state, (draft) => {
    draft.achievements = new Set([...draft.achievements, ...triggers]);
  });
  return { state: newState, triggers };
}
