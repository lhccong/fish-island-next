export function createActivityFixture() {
  const state = { competitions: 0, draws: 0, drawCount: 0, rank: null as number | null };
  const prize = {
    id: '78',
    prizeId: '78',
    name: '营地口粮',
    icon: 'https://camp.test/item.svg',
    qualityName: '普通',
    probability: 1,
  };
  const supply = {
    id: '3',
    name: '每日补给',
    costPoints: 10,
    guaranteeCount: 10,
    prizeList: [prize],
  };
  function handle(path: string, body: unknown): { data: unknown } | undefined {
    if (path === 'pet/tournament/leaderboard')
      return {
        data: [
          {
            userId: '124',
            userName: '合成岛友乙',
            petName: '栗栗',
            petLevel: 9,
            petUrl: 'https://camp.test/companion.svg',
            rank: 1,
          },
        ],
      };
    if (path === 'pet/tournament/my/rank') return { data: state.rank };
    if (path === 'pet/tournament/challenge') {
      state.competitions++;
      state.rank = 1;
      return { data: { isWin: true, myRank: 1, rounds: [] } };
    }
    if (path === 'turntable/list') return { data: [supply] };
    if (path === 'turntable/detail/3') return { data: supply };
    if (path === 'turntable/draw') {
      const count = (body as { drawCount: number }).drawCount;
      state.draws++;
      state.drawCount += count;
      return {
        data: { costPoints: 10 * count, prizeList: Array.from({ length: count }, () => prize) },
      };
    }
    if (path === 'turntable/records')
      return {
        data: {
          records: state.draws ? [{ ...prize, createTime: '2026-11-12 12:00' }] : [],
          total: state.draws ? 1 : 0,
        },
      };
    return undefined;
  }
  return { state, handle };
}
