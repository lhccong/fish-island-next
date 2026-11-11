import type { Allocation } from './core.state';

export type CultivationEventKind = 'normal' | 'good' | 'danger' | 'realm';
export interface CultivationEvent {
  id: number;
  event: string;
  kind: CultivationEventKind;
  weight?: number;
  minRealm?: number;
  maxRealm?: number;
  minLuck?: number;
  minAge?: number;
  maxAge?: number;
  once?: boolean;
  fatal?: boolean;
  effect?: Partial<Allocation>;
  trainingFactor?: number;
  category?: string;
  scene?: number;
}

// This library is independent of the classic life simulator's events and age pools.

import entries from './cultivation-events.json';
export const cultivationEvents = new Map<number, CultivationEvent>(
  entries as [number, CultivationEvent][],
);
export function formatCultivationEvent(id: number, values: Record<string, string | number> = {}) {
  const event = cultivationEvents.get(id);
  if (!event) throw new Error(`Unknown cultivation event: ${id}`);
  return event.event.replace(/\{(\w+)\}/g, (_, key) => {
    if (values[key] === undefined) throw new Error(`Missing cultivation event parameter: ${key}`);
    return String(values[key]);
  });
}

export function cultivationEventPool(
  realm: number,
  luck: number,
  seen: ReadonlySet<number>,
  age = 0,
) {
  return Array.from(cultivationEvents.values())
    .filter(
      (event) =>
        event.weight &&
        realm >= (event.minRealm || 0) &&
        realm <= (event.maxRealm ?? 13) &&
        luck >= (event.minLuck || 0) &&
        age >= (event.minAge || 0) &&
        age <= (event.maxAge ?? Infinity) &&
        !(event.once && seen.has(event.id)),
    )
    .map((event) => [event.id, event.weight!] as [number, number]);
}
