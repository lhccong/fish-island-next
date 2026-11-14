export const wordPairs = [
  ['苹果', '橙子'],
  ['医生', '护士'],
  ['老师', '学生'],
  ['猫', '狗'],
  ['电影', '电视剧'],
  ['春天', '夏天'],
  ['咖啡', '茶'],
  ['书', '报纸'],
  ['汽车', '摩托车'],
  ['手机', '电脑'],
  ['饺子', '馄饨'],
  ['海豚', '鲸鱼'],
] as const;
export interface LocalPlayer {
  id: string;
  name: string;
  role: 'civilian' | 'undercover';
  alive: boolean;
}
export interface LocalGame {
  players: LocalPlayer[];
  words: readonly [string, string];
  round: number;
  phase: 'deal' | 'describe' | 'vote' | 'round' | 'finished';
  turn: number;
  ballots: Record<string, string>;
  descriptions: { id: string; name: string; text: string; round: number }[];
  tally: Record<string, number>;
  eliminated: string | null;
  winner: 'civilian' | 'undercover' | null;
}
export type LocalAction =
  { type: 'next' } | { type: 'describe'; text: string } | { type: 'vote'; target: string };
export function createLocalGame(
  names: string[],
  count: number,
  words: readonly [string, string],
  random = Math.random,
): LocalGame {
  if (
    names.length < 3 ||
    names.length > 20 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count * 2 >= names.length
  )
    throw new Error('需要 3–20 名玩家，卧底人数必须少于平民');
  const clean = names.map((name) => name.trim());
  if (clean.some((name) => !name || name.length > 20) || new Set(clean).size !== clean.length)
    throw new Error('玩家昵称须为 1–20 字且不能重复');
  if (!words[0].trim() || !words[1].trim() || words[0].trim() === words[1].trim())
    throw new Error('请设置两个不同的词语');
  const order = clean.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const spies = new Set(order.slice(0, count));
  return {
    players: clean.map((name, i) => ({
      id: String(i + 1),
      name,
      role: spies.has(i) ? 'undercover' : 'civilian',
      alive: true,
    })),
    words: [words[0].trim(), words[1].trim()],
    round: 1,
    phase: 'deal',
    turn: 0,
    ballots: {},
    descriptions: [],
    tally: {},
    eliminated: null,
    winner: null,
  };
}
export function localWord(game: LocalGame, id: string) {
  const player = game.players.find((p) => p.id === id);
  if (!player) throw new Error('玩家不存在');
  return game.words[player.role === 'civilian' ? 0 : 1];
}
export function advanceLocalGame(game: LocalGame, action: LocalAction): LocalGame {
  const alive = game.players.filter((p) => p.alive);
  const current = alive[game.turn];
  if (game.phase === 'finished' || !current) return game;
  const last = game.turn === alive.length - 1;
  if (game.phase === 'deal' && action.type === 'next')
    return { ...game, phase: last ? 'describe' : 'deal', turn: last ? 0 : game.turn + 1 };
  if (game.phase === 'round' && action.type === 'next')
    return {
      ...game,
      phase: 'describe',
      round: game.round + 1,
      turn: 0,
      ballots: {},
      tally: {},
      eliminated: null,
    };
  if (game.phase === 'describe' && action.type === 'describe') {
    const text = action.text.trim();
    if (text.length > 200) throw new Error('描述最多 200 字');
    return {
      ...game,
      phase: last ? 'vote' : 'describe',
      turn: last ? 0 : game.turn + 1,
      descriptions: text
        ? [
            ...game.descriptions,
            { id: `${game.round}:${current.id}`, name: current.name, text, round: game.round },
          ]
        : game.descriptions,
    };
  }
  if (game.phase !== 'vote' || action.type !== 'vote') return game;
  if (action.target === current.id || !alive.some((p) => p.id === action.target))
    throw new Error('请投给另一位在场玩家');
  const ballots = { ...game.ballots, [current.id]: action.target };
  if (!last) return { ...game, ballots, turn: game.turn + 1 };
  const tally: Record<string, number> = {};
  Object.values(ballots).forEach((id) => {
    tally[id] = (tally[id] ?? 0) + 1;
  });
  const highest = Math.max(...Object.values(tally));
  const targets = alive.filter((p) => tally[p.id] === highest);
  const eliminated = targets.length === 1 ? targets[0]!.id : null;
  const players = game.players.map((p) => (p.id === eliminated ? { ...p, alive: false } : p));
  const spies = players.filter((p) => p.alive && p.role === 'undercover').length;
  const civilians = players.filter((p) => p.alive && p.role === 'civilian').length;
  const winner = spies === 0 ? 'civilian' : spies >= civilians ? 'undercover' : null;
  return {
    ...game,
    players,
    ballots,
    tally,
    eliminated,
    winner,
    phase: winner ? 'finished' : 'round',
    turn: 0,
  };
}
