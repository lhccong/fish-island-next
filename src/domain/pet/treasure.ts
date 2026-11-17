export const treasureSites = [
  { id: 'grove', name: '林间', x: 31, y: 50 },
  { id: 'brook', name: '溪畔', x: 62, y: 50 },
  { id: 'path', name: '小径', x: 78, y: 69 },
  { id: 'flowers', name: '花丛', x: 30, y: 74 },
  { id: 'clearing', name: '空地', x: 54, y: 74 },
] as const;
export type TreasureSiteId = (typeof treasureSites)[number]['id'];
export interface TreasureState {
  serverNow: number;
  resetAt: number;
  nextAvailableAt: number;
  used: number;
  active: { id: string; siteId: TreasureSiteId; readyAt: number } | null;
  lastReward: { id: string; siteId: TreasureSiteId; points: number } | null;
}
export interface TreasurePort {
  treasureStatus(signal: AbortSignal): Promise<TreasureState>;
  startTreasure(siteId: TreasureSiteId, signal: AbortSignal): Promise<TreasureState>;
  finishTreasure(id: string, signal: AbortSignal): Promise<TreasureState>;
}
