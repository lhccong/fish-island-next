import type { LandlordsEvent, LandlordsPort, RankingPort } from '@/domain/landlords';
import { decodeLandlords, id, record, text } from './decode';
export function createLandlordsChannel() {
  let connected = false;
  let sender: ((frame: unknown) => boolean) | null = null;
  const listeners = new Set<{
    event: (e: LandlordsEvent) => void;
    connection: (connected: boolean) => void;
  }>();
  const port: LandlordsPort = {
    connected: () => connected,
    subscribe(event, connection) {
      const l = { event, connection };
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    send(userId, type, body = {}) {
      return (
        connected &&
        !!sender?.({
          type: 2,
          userId,
          data: JSON.stringify({ type, content: JSON.stringify(body) }),
        })
      );
    },
  };
  return {
    port,
    receive(raw: unknown) {
      const e = decodeLandlords(raw);
      if (e) listeners.forEach((l) => l.event(e));
    },
    connection(status: string, send: ((frame: unknown) => boolean) | null) {
      connected = status === 'connected';
      sender = send;
      listeners.forEach((l) => l.connection(connected));
    },
  };
}
export function createLandlordsRanking(base: string): RankingPort {
  return {
    async load(sort, signal) {
      const response = await fetch(
        `${base.replace(/\/+$/, '')}/api/ranking/list?gameType=1&topN=50&minGames=5&sortBy=${encodeURIComponent(sort)}`,
        { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`排行暂不可用（HTTP ${response.status}），请重试`);
      const payload = record(await response.json());
      if (payload.code !== 0 || !Array.isArray(payload.data))
        throw new Error(text(payload.message) || '排行榜格式有误，请重试');
      return payload.data.map((v: unknown) => {
        const p = record(v);
        return {
          id: id(p.userId),
          name: text(p.userName) || '岛友',
          rank: Number(p.rank) || 0,
          games: Number(p.totalGames) || 0,
          rate: Number(p.winRate) || 0,
          score: Number(p.totalScore) || 0,
        };
      });
    },
  };
}
