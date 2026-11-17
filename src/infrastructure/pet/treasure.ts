import { treasureSites, type TreasurePort, type TreasureState } from '@/domain/pet';
import { record } from './decode';

function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error('挖宝状态异常，请刷新后重试');
  return value;
}
function timestamp(value: unknown, min = 0): number {
  // The backend's JsonConfig serializes Java long/Long values as decimal strings.
  const normalized =
    typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
  return integer(normalized, min);
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 36)
    throw new Error('挖宝记录异常，请刷新后重试');
  return value;
}
function site(value: unknown) {
  const result = treasureSites.find((entry) => entry.id === value);
  if (!result) throw new Error('挖宝地点异常，请刷新后重试');
  return result.id;
}
export function decodeTreasure(value: unknown): TreasureState {
  const data = record(value);
  const active = data.active == null ? null : record(data.active);
  const reward = data.lastReward == null ? null : record(data.lastReward);
  if (active && reward) throw new Error('挖宝状态冲突，请刷新后重试');
  return {
    serverNow: timestamp(data.serverNow, 1),
    resetAt: timestamp(data.resetAt, 1),
    nextAvailableAt: timestamp(data.nextAvailableAt),
    used: integer(data.used, 0, 5),
    active: active
      ? {
          id: identifier(active.id),
          siteId: site(active.siteId),
          readyAt: timestamp(active.readyAt, 1),
        }
      : null,
    lastReward: reward
      ? {
          id: identifier(reward.id),
          siteId: site(reward.siteId),
          points: integer(reward.points, 1, 10),
        }
      : null,
  };
}
export function createTreasureClient(
  request: (path: string, signal: AbortSignal, body?: object) => Promise<unknown>,
): TreasurePort {
  return {
    async treasureStatus(signal) {
      return decodeTreasure(await request('pet/treasure/status', signal));
    },
    async startTreasure(siteId, signal) {
      return decodeTreasure(await request('pet/treasure/start', signal, { siteId }));
    },
    async finishTreasure(id, signal) {
      return decodeTreasure(await request('pet/treasure/finish', signal, { id }));
    },
  };
}
