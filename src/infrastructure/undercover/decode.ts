import type { UndercoverRoom, UndercoverPlayer, UndercoverVote } from '@/domain/undercover';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('卧底服务数据格式异常');
  return value as Record<string, unknown>;
}
export function id(value: unknown): string {
  if (typeof value === 'string' && /^[\w-]{1,100}$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  throw new Error('卧底服务编号异常');
}
export const text = (value: unknown) => (typeof value === 'string' ? value : '');
export function list<T>(value: unknown, decode: (item: unknown) => T): T[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('卧底服务列表异常');
  return value.map(decode);
}
function integer(value: unknown, fallback = 0) {
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('卧底服务数值异常');
  return value;
}
function player(value: unknown): UndercoverPlayer {
  const d = record(value);
  let avatar: string | null = null;
  try {
    const url = new URL(text(d.userAvatar));
    if (url.protocol === 'https:' || url.protocol === 'http:') avatar = url.href;
  } catch {
    /* 使用昵称占位 */
  }
  return {
    id: id(d.userId),
    name: text(d.userName) || '岛友',
    avatar,
    eliminated: d.isEliminated === true,
    votes: integer(d.voteCount),
    guessesLeft: integer(d.remainingGuessCount, 3),
  };
}
function vote(value: unknown): UndercoverVote {
  const d = record(value);
  return {
    voterId: id(d.voterId),
    voterName: text(d.voterName),
    targetId: id(d.targetId),
    targetName: text(d.targetName),
  };
}
export function room(value: unknown): UndercoverRoom {
  const d = record(value);
  if (d.status !== 'WAITING' && d.status !== 'PLAYING' && d.status !== 'ENDED')
    throw new Error('未知房间状态，请刷新重试');
  const eliminated = new Set(list(d.eliminatedIds, id));
  const players = list(d.participants, player).map((p) => ({
    ...p,
    eliminated: p.eliminated || eliminated.has(p.id),
  }));
  for (const participant of list(d.participantIds, id)) {
    if (!players.some((p) => p.id === participant))
      players.push({
        id: participant,
        name: '岛友',
        avatar: null,
        eliminated: eliminated.has(participant),
        votes: 0,
        guessesLeft: 3,
      });
  }
  const order = list(d.orderedParticipantIds, id);
  if (order.length)
    players.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
    });
  if (new Set(players.map((p) => p.id)).size !== players.length)
    throw new Error('房间玩家重复，请刷新重试');
  return {
    id: id(d.roomId),
    status: d.status,
    creatorId: id(d.creatorId),
    creatorName: text(d.creatorName) || '岛友',
    players,
    maxPlayers: integer(d.maxPlayers, 6),
    mode: d.gameMode === 2 ? 2 : 1,
    word: text(d.word),
    role: d.gameMode === 2 && (d.role === 'civilian' || d.role === 'undercover') ? d.role : null,
    result: text(d.gameResult),
    votes: list(d.votes, vote),
  };
}
