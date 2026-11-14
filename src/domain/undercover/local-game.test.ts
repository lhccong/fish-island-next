import { describe, expect, it } from 'vitest';
import { createLocalGame, advanceLocalGame, localWord, type LocalGame } from './local-game';
const create = (n = 5) =>
  createLocalGame(
    Array.from({ length: n }, (_, i) => `玩家${i + 1}`),
    1,
    ['苹果', '橙子'],
    () => 0.999,
  );
function voting(game: LocalGame) {
  let next = game;
  while (next.phase === 'deal') next = advanceLocalGame(next, { type: 'next' });
  while (next.phase === 'describe')
    next = advanceLocalGame(next, { type: 'describe', text: '圆圆的' });
  return next;
}
function ballots(game: LocalGame, targets: string[]) {
  return targets.reduce((g, target) => advanceLocalGame(g, { type: 'vote', target }), voting(game));
}
describe('同屏游戏完整轮次', () => {
  it('rejects invalid player and spy counts, names and word pairs', () => {
    for (const [names, count] of [
      [['甲', '乙'], 1],
      [['甲', '乙', '丙'], 2],
      [['甲', '乙', '丙'], 0],
      [['甲', '甲', '乙'], 1],
      [['', '乙', '丙'], 1],
    ] as [string[], number][])
      expect(() => createLocalGame(names, count, ['苹果', '橙子'])).toThrow();
    expect(() => createLocalGame(['甲', '乙', '丙'], 1, ['相同', ' 相同 '])).toThrow();
  });
  it('shuffles without mutating input and deals the requested count', () => {
    const names = ['甲', '乙', '丙', '丁', '戊'];
    const game = createLocalGame(names, 2, ['苹果', '橙子'], () => 0);
    expect(names).toEqual(['甲', '乙', '丙', '丁', '戊']);
    expect(game.players.filter((p) => p.role === 'undercover')).toHaveLength(2);
    expect(game.players.find((p) => p.role === 'undercover')?.id).not.toBe('1');
    expect(localWord(game, game.players.find((p) => p.role === 'undercover')!.id)).toBe('橙子');
  });
  it('advances every player, keeps ballots private until settlement, and rejects self votes', () => {
    const initial = create();
    const game = voting(initial);
    expect(game.descriptions).toHaveLength(5);
    expect(game.turn).toBe(0);
    expect(() => advanceLocalGame(game, { type: 'vote', target: '1' })).toThrow();
    const next = advanceLocalGame(game, { type: 'vote', target: '2' });
    expect(next.tally).toEqual({});
    expect(initial.phase).toBe('deal');
    expect(initial.descriptions).toEqual([]);
  });
  it('ties eliminate nobody and continue with fresh ballots', () => {
    const game = ballots(create(3), ['2', '3', '1']);
    expect(game.phase).toBe('round');
    expect(game.eliminated).toBeNull();
    expect(game.players.every((p) => p.alive)).toBe(true);
    const next = advanceLocalGame(game, { type: 'next' });
    expect(next.round).toBe(2);
    expect(next.ballots).toEqual({});
    expect(next.descriptions).toHaveLength(3);
  });
  it('eliminating the last spy wins for civilians, includes final ballot, and freezes terminal state', () => {
    const game = ballots(create(), ['2', '1', '1', '1', '1']);
    expect(game.tally['1']).toBe(4);
    expect(game.winner).toBe('civilian');
    expect(game.phase).toBe('finished');
    expect(advanceLocalGame(game, { type: 'next' })).toBe(game);
  });
  it('civilian elimination can give spies victory and never mutates a prior snapshot', () => {
    const initial = create(3);
    const game = ballots(initial, ['2', '3', '2']);
    expect(game.winner).toBe('undercover');
    expect(game.players[1]?.alive).toBe(false);
    expect(initial.players[1]?.alive).toBe(true);
  });
  it('eliminated players cannot describe or vote in the following round', () => {
    const game = ballots(create(), ['2', '3', '2', '2', '2']);
    expect(game.phase).toBe('round');
    const next = voting(advanceLocalGame(game, { type: 'next' }));
    expect(next.descriptions.filter((d) => d.round === 2)).toHaveLength(4);
    expect(next.descriptions.filter((d) => d.round === 2).some((d) => d.name === '玩家2')).toBe(
      false,
    );
    expect(() => advanceLocalGame(next, { type: 'vote', target: '2' })).toThrow();
  });
});
