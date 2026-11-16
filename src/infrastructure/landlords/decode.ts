import type { LandlordsEvent, Player, Result, Room, TableState } from '@/domain/landlords';
export const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, 1000) : '');
export const id = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) ? String(v) : text(v);
const number = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const cards = (v: unknown) =>
  array(v)
    .slice(0, 54)
    .map((c) => (typeof c === 'string' ? c : id(record(c).id)))
    .filter(Boolean);
function player(v: unknown): Player {
  const p = record(v);
  return {
    id: id(p.userId),
    name: text(p.userName) || '岛友',
    avatar: /^https?:\/\//i.test(text(p.avatar)) ? text(p.avatar) : null,
    ready: Boolean(p.isReady ?? p.ready),
    online: (p.isOnline ?? p.online) !== false,
    robot: Boolean(p.isRobotControlled ?? p.robotControlled),
    owner: p.role === 'OWNER',
    count: typeof p.cardCount === 'number' ? number(p.cardCount) : null,
    played: cards(p.currentPlayedCards),
  };
}
function result(v: unknown): Result {
  const r = record(v);
  return {
    message: text(r.message) || (r.isLandlordWin ? '地主获胜' : '农民获胜'),
    players: array(r.players).map((v) => {
      const p = record(v);
      return {
        id: id(p.userId),
        name: text(p.userName),
        winner: Boolean(p.isWinner),
        score: typeof p.scoreChange === 'number' ? number(p.scoreChange) : null,
      };
    }),
  };
}
function state(d: Record<string, unknown>): Partial<TableState> {
  const patch: Partial<TableState> = {};
  if (d.roomId != null) patch.roomId = id(d.roomId);
  if (d.ownerId != null) patch.ownerId = id(d.ownerId);
  if (Array.isArray(d.players)) patch.players = d.players.map(player).filter((p) => p.id);
  for (const [field, target] of [
    ['handCards', 'hand'],
    ['bottomCards', 'bottom'],
  ] as const)
    if (Array.isArray(d[field])) patch[target] = cards(d[field]);
  if (d.landlordId != null) patch.landlordId = id(d.landlordId);
  const phase = d.phase ?? d.roomState ?? d.state;
  if (phase != null)
    patch.phase =
      typeof phase === 'number'
        ? (['closed', 'waiting', 'waiting', 'dealing', 'robbing', 'playing', 'ending'][phase] ??
          'waiting')
        : text(phase).toLowerCase().replace('distributing', 'dealing');
  if (patch.phase === 'waiting' || patch.phase === 'dealing')
    Object.assign(patch, {
      hand: [],
      bottom: [],
      landlordId: '',
      currentId: '',
      action: '',
      options: [],
      canPass: false,
      deadline: 0,
    });
  if (d.currentPlayerId != null || d.currentRobPlayerId != null)
    patch.currentId = id(d.currentPlayerId ?? d.currentRobPlayerId);
  if (d.gameResult != null) patch.result = result(d.gameResult);
  if (patch.phase === 'waiting' && patch.players)
    patch.players = patch.players.map((p) => ({ ...p, count: 0, played: [] }));
  if (patch.phase === 'robbing' || patch.phase === 'playing')
    patch.action = patch.phase === 'robbing' ? 'ROB' : 'PLAY';
  if (patch.phase === 'robbing' && Array.isArray(d.handCards)) patch.result = null;
  if (typeof d.highestRobScore === 'number' && patch.phase === 'robbing')
    patch.options = [0, 1, 2, 3].map((value) => ({
      value,
      name: value ? `${value} 分` : '不叫',
      enabled: value === 0 || value > number(d.highestRobScore),
    }));
  if ('lastPlayerId' in d && patch.phase === 'playing')
    patch.canPass = d.lastPlayerId != null && id(d.lastPlayerId) !== patch.currentId;
  if (d.action === 'CREATE' || d.event === 'GAME_START') patch.result = null;
  return patch;
}
export function decodeLandlords(raw: unknown): LandlordsEvent | null {
  try {
    if (typeof raw === 'string' && raw.length > 262144) return null;
    const frame = record(typeof raw === 'string' ? JSON.parse(raw) : raw);
    const type = text(frame.type);
    if (type === 'error')
      return {
        type: 'error',
        message: text(frame.data) || text(frame.message) || '操作失败，请重试',
      };
    if (!type.startsWith('game')) return null;
    if (typeof frame.code === 'number' && frame.code !== 0)
      return { type: 'error', message: text(frame.message) || '操作失败，请重试' };
    let d = record(typeof frame.data === 'string' ? JSON.parse(frame.data) : frame.data);
    if (d.success === false)
      return { type: 'error', message: text(d.message) || '操作失败，请同步房间后重试' };
    if (d.data && typeof d.data === 'object') d = record(d.data);
    if (d.gameType != null && d.gameType !== 'LANDLORDS_CLASSIC') return null;
    if (type === 'gameRoomList') {
      const rooms: Room[] = array(d.rooms)
        .filter((v) => record(v).gameType === 'LANDLORDS_CLASSIC')
        .map((v) => {
          const r = record(v);
          return {
            id: id(r.roomId),
            count: number(r.playerCount),
            max: number(r.maxPlayers) || 3,
            locked: Boolean(r.needPassword),
            players: array(r.players).map(player),
          };
        });
      return { type: 'rooms', rooms, restriction: id(record(d.restriction).roomId) };
    }
    if (type === 'gameRoomClosed') return { type: 'closed', roomId: id(d.roomId ?? frame.data) };
    if (['gameRoomAdded', 'gameRoomRemoved'].includes(type)) return { type: 'refresh' };
    if (type === 'gameLeaveRoom') return { type: 'left', restriction: id(d.tempLeaveRoomId) };
    if (type === 'gameStateUpdate' && d.event === 'playerStatusChange' && d.userId != null)
      return {
        type: 'player',
        id: id(d.userId),
        ...(d.status === 'online' || d.status === 'offline'
          ? { online: d.status === 'online' }
          : {}),
        ...(d.status === 'robotEnabled' || d.status === 'robotDisabled'
          ? { robot: d.status === 'robotEnabled' }
          : {}),
      };
    if (
      type === 'gameStateUpdate' &&
      d.event === 'playerLeave' &&
      d.userId != null &&
      !d.players &&
      !d.roomInfo
    )
      return { type: 'player', id: id(d.userId), leave: true };
    if (type === 'gameChat')
      return d.content
        ? { type: 'chat', name: text(d.userName) || '岛友', content: text(d.content) }
        : { type: 'ack', command: type };
    if (type === 'gameActionResult') {
      if (d.event === 'GAME_OVER' || d.event === 'GAME_FORCE_END')
        return {
          type: 'state',
          patch: { phase: 'ending', result: result(d), action: '', deadline: 0 },
          action: 'RESULT',
        };
      if (['PLAY_RESULT', 'PASS_RESULT', 'ROBOT_ENABLED', 'ROBOT_DISABLED'].includes(text(d.event)))
        return {
          type: 'played',
          id: id(d.playerId),
          cards: cards(d.pokerIds),
          message: text(d.message),
          ...(['ROBOT_ENABLED', 'ROBOT_DISABLED'].includes(text(d.event))
            ? { robot: d.event === 'ROBOT_ENABLED' }
            : {}),
        };
    }
    if (type === 'gameTurnNotify')
      return {
        type: 'state',
        action: 'TURN',
        patch: {
          ...state(d),
          action: text(d.action),
          canPass: d.canPass === true,
          options: array(d.actionOptions).map((v) => {
            const o = record(v);
            return { value: number(o.value), name: text(o.name), enabled: o.enabled === true };
          }),
          deadline: (number(d.startTime) || Date.now()) + number(d.timeout) * 1000,
        },
      };
    if (
      [
        'gameRoomState',
        'gameStateUpdate',
        'gameStart',
        'gameDealCards',
        'gameReady',
        'gamePlayCards',
        'gamePass',
        'gameRobLandlord',
        'gameOver',
        'gameActionResult',
      ].includes(type)
    ) {
      const inner = d.gameState ? record(d.gameState) : { ...record(d.roomInfo), ...d };
      return { type: 'state', patch: state(inner), action: text(d.action) || type };
    }
    return { type: 'ack', command: type };
  } catch {
    return null;
  }
}
