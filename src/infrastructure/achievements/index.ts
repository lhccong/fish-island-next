import type { AchievementPort, AchievementSummary } from '@/domain/achievements';
import { AuthError, type SessionToken } from '@/domain/auth';

function object(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw new Error('成就数据格式错误');
}

function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  throw new Error('成就数据格式错误');
}

function text(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('成就数据格式错误');
}

function integer(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  throw new Error('成就数据格式错误');
}

function flag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  throw new Error('成就数据格式错误');
}

function decode(value: unknown): AchievementSummary {
  const summary = object(value);
  return {
    awardedPoints: integer(summary.awardedPoints),
    achievements: array(summary.achievements).map((value) => {
      const item = object(value);
      const unit = item.unit ?? '级';
      if (unit !== '级' && unit !== '次' && unit !== '人') throw new Error('成就数据格式错误');
      return {
        id: text(item.id),
        name: text(item.name),
        label: text(item.label),
        icon: text(item.icon),
        unit,
        interval: integer(item.interval),
        points: integer(item.points),
        tracks: array(item.tracks).map((value) => {
          const track = object(value);
          return {
            id: integer(track.id),
            label: track.label == null ? null : text(track.label),
            level: integer(track.level),
            enabled: flag(track.enabled),
            next: track.next == null ? null : integer(track.next),
            claimedTiers: integer(track.claimedTiers),
            claimablePoints: integer(track.claimablePoints),
          };
        }),
      };
    }),
  };
}

export function createAchievementClient(
  baseUrl: string,
  credential: () => SessionToken | null,
  onUnauthorized: () => void,
): AchievementPort {
  const url = baseUrl.replace(/\/+$/, '') + '/api/user/achievements';
  async function request(claim: boolean, signal: AbortSignal) {
    try {
      const token = credential();
      if (!token) throw new AuthError('unauthorized', '请先登录');
      const response = await fetch(claim ? url + '/claim' : url, {
        method: claim ? 'POST' : 'GET',
        headers: new Headers({ [token.name]: token.value }),
        credentials: 'include',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error('成就服务暂不可用，请重试');
      const envelope = object(await response.json());
      if (envelope.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (envelope.code !== 0)
        throw new Error(
          typeof envelope.message === 'string' ? envelope.message : '成就服务暂不可用，请重试',
        );
      return decode(envelope.data);
    } catch (error) {
      if (error instanceof AuthError && !signal.aborted) onUnauthorized();
      if (
        error instanceof TypeError ||
        (error instanceof DOMException && error.name === 'TimeoutError')
      )
        throw new Error('连接成就服务失败，请重试');
      throw error;
    }
  }

  return {
    list: (signal) => request(false, signal),
    claim: (signal) => request(true, signal),
  };
}
