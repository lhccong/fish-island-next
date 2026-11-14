export interface Player {
  id: string;
  name: string;
  ready: boolean;
  online: boolean;
  robot: boolean;
  owner: boolean;
  count: number | null;
  played: string[];
}
export interface Room {
  id: string;
  count: number;
  max: number;
  locked: boolean;
  players: Player[];
}
export interface Result {
  message: string;
  players: { id: string; name: string; winner: boolean; score: number | null }[];
}
export interface TableState {
  roomId: string;
  phase: string;
  ownerId: string;
  players: Player[];
  hand: string[];
  bottom: string[];
  landlordId: string;
  currentId: string;
  action: string;
  canPass: boolean;
  options: { value: number; name: string; enabled: boolean }[];
  deadline: number;
  result: Result | null;
}
export const emptyTable = (): TableState => ({
  roomId: '',
  phase: 'waiting',
  ownerId: '',
  players: [],
  hand: [],
  bottom: [],
  landlordId: '',
  currentId: '',
  action: '',
  canPass: false,
  options: [],
  deadline: 0,
  result: null,
});
export type LandlordsEvent =
  | { type: 'rooms'; rooms: Room[]; restriction: string }
  | { type: 'state'; patch: Partial<TableState>; action: string }
  | { type: 'played'; id: string; cards: string[]; message: string; robot?: boolean }
  | { type: 'chat'; name: string; content: string }
  | { type: 'player'; id: string; online?: boolean; robot?: boolean; leave?: boolean }
  | { type: 'closed'; roomId: string }
  | { type: 'left'; restriction: string }
  | { type: 'refresh' }
  | { type: 'error'; message: string }
  | { type: 'ack'; command: string };
export interface LandlordsPort {
  connected(): boolean;
  subscribe(
    event: (event: LandlordsEvent) => void,
    connection: (connected: boolean) => void,
  ): () => void;
  send(userId: string, command: string, body?: Record<string, unknown>): boolean;
}
export interface RankingEntry {
  id: string;
  name: string;
  rank: number;
  games: number;
  rate: number;
  score: number;
}
export interface RankingPort {
  load(sort: string, signal: AbortSignal): Promise<RankingEntry[]>;
}
export function mergeTable(state: TableState, event: LandlordsEvent, userId: string): TableState {
  if (event.type === 'state') {
    const patch = event.patch;
    return {
      ...state,
      ...patch,
      ...(patch.players
        ? {
            players: patch.players.map((p) => {
              const old = state.players.find((item) => item.id === p.id);
              return p.count === null
                ? { ...p, count: old?.count ?? null, played: old?.played ?? [] }
                : p;
            }),
          }
        : {}),
    };
  }
  if (event.type === 'player')
    return {
      ...state,
      players: state.players
        .filter((p) => !(event.leave && p.id === event.id))
        .map((p) =>
          p.id !== event.id
            ? p
            : {
                ...p,
                ...(event.online === undefined ? {} : { online: event.online }),
                ...(event.robot === undefined ? {} : { robot: event.robot }),
              },
        ),
    };
  if (event.type !== 'played') return state;
  return {
    ...state,
    hand: event.id === userId ? state.hand.filter((id) => !event.cards.includes(id)) : state.hand,
    players: state.players.map((p) =>
      p.id !== event.id
        ? p
        : {
            ...p,
            played: event.robot === undefined ? event.cards : p.played,
            count:
              p.count === null
                ? null
                : Math.max(0, p.count - (event.robot === undefined ? event.cards.length : 0)),
            ...(event.robot === undefined ? {} : { robot: event.robot }),
          },
    ),
  };
}
export function cardFace(id: string) {
  const base = id.split('#')[0]!;
  if (['s', 'sx', 'sj', '🃏小王'].includes(base.toLowerCase()))
    return { rank: 16, label: '小王', suit: '☆', red: false };
  if (['x', 'dx', 'bj', '🃏大王'].includes(base.toLowerCase()))
    return { rank: 17, label: '大王', suit: '★', red: true };
  const suit =
    ({ s: '♠', h: '♥', c: '♣', d: '♦' } as Record<string, string>)[base[0]?.toLowerCase() ?? ''] ??
    base[0] ??
    '?';
  const label = base.slice(1).toUpperCase();
  const rank =
    ({ J: 11, Q: 12, K: 13, A: 14, '2': 15 } as Record<string, number>)[label] ?? Number(label);
  return {
    rank: Number.isFinite(rank) ? rank : 0,
    label: label || '?',
    suit,
    red: suit === '♥' || suit === '♦',
  };
}
