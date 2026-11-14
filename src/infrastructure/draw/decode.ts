import type { DrawRoom, DrawGuess } from '@/domain/draw';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('绘画服务数据异常');
  return value as Record<string, unknown>;
}
export const text = (v: unknown) => (typeof v === 'string' ? v : '');
export function id(v: unknown): string {
  if (typeof v === 'string' && /^[\w-]{1,100}$/.test(v)) return v;
  if (typeof v === 'number' && Number.isSafeInteger(v)) return String(v);
  throw new Error('绘画服务编号异常');
}
export function number(v: unknown, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0)
    throw new Error('绘画服务数值异常');
  return v;
}
export function list<T>(v: unknown, decode: (v: unknown) => T): T[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new Error('绘画服务列表异常');
  return v.map(decode);
}
export function image(v: unknown) {
  const value = text(v);
  if (!value) return '';
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value) || value.length > 4000000)
    throw new Error('画布数据异常');
  return value;
}
export function room(v: unknown): DrawRoom {
  const d = record(v);
  if (!['WAITING', 'PLAYING', 'ENDED'].includes(text(d.status))) throw new Error('未知房间状态');
  const players = list(d.participants, (v) => {
    const p = record(v);
    return {
      id: id(p.userId),
      name: text(p.userName) || '岛友',
      score: number(p.score),
      correct: p.hasGuessedCorrectly === true,
    };
  });
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error('房间玩家重复');
  return {
    id: id(d.roomId),
    creatorId: id(d.creatorId),
    creatorName: text(d.creatorName) || '岛友',
    status: d.status as DrawRoom['status'],
    maxPlayers: number(d.maxPlayers, 8),
    players,
    count: number(d.currentPlayers, players.length),
    drawerId: d.currentDrawerId == null ? '' : id(d.currentDrawerId),
    drawerName: text(d.currentDrawerName),
    word: text(d.currentWord),
    hint: text(d.wordHint),
    round: number(d.currentRound),
    rounds: number(d.totalRounds, 6),
    endTime: number(d.roundEndTime),
    image: image(d.drawData),
    creatorOnly: d.creatorOnlyMode === true,
  };
}
export function guess(v: unknown): DrawGuess {
  const d = record(v);
  return {
    id: `${id(d.userId)}:${text(d.guessTime) || number(d.guessTime)}:${text(d.guessWord)}`,
    name: text(d.userName) || '岛友',
    word: text(d.guessWord),
    correct: d.isCorrect === true,
  };
}
