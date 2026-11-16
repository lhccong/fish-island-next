import type { OnlineMember } from './index';

export function sortMembersByLevel(members: readonly OnlineMember[]): readonly OnlineMember[] {
  return [...members].sort((left, right) => (right.level ?? -1) - (left.level ?? -1));
}
