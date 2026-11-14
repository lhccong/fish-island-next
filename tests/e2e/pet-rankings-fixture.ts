import type { Page } from '@playwright/test';
export const rankingPaths = [
  'api/pet/rank/list',
  'boss/ranking',
  'tower/ranking',
  'pet/tournament/leaderboard',
];
export async function setupRankings(page: Page) {
  const pending = new Set<() => void>();
  const state = {
    fail: false,
    empty: false,
    hold: false,
    release: () => {
      for (const resolve of pending) resolve();
      pending.clear();
    },
    requests: [] as string[],
  };
  await page.route('https://ranks.test/**', (route) =>
    route.request().url().endsWith('broken.png')
      ? route.fulfill({ status: 404, body: '' })
      : route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path fill="#b5d7d0" d="M0 0h40v40H0z"/><circle cx="20" cy="15" r="9" fill="#426a63"/><path fill="#426a63" d="M5 40v-8q15-18 30 0v8"/></svg>',
        }),
  );
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\//, '');
    if (!rankingPaths.includes(path)) return route.fallback();
    state.requests.push(path);
    if (state.hold)
      await new Promise<void>((resolve) => {
        pending.add(resolve);
      });
    if (state.fail)
      return route.fulfill({ json: { code: 40000, message: '合成排行读取失败，请重试' } });
    const records = Array.from({ length: 20 }, (_, n) => ({
      userId: String(n === 19 ? 123 : 124 + n),
      petId: String(18 + n),
      userName: n === 1 ? '合成长昵称' + 'e\u0301'.repeat(60) : `合成岛友 ${n + 1}`,
      userAvatar:
        n === 2 ? 'https://ranks.test/broken.png' : n === 3 ? '' : 'https://ranks.test/avatar.svg',
      petName: n === 1 ? '合成超长伙伴名字'.repeat(8) : `栗栗 ${n + 1}`,
      name: n === 1 ? '合成超长伙伴名字'.repeat(8) : `栗栗 ${n + 1}`,
      petUrl: 'https://camp.test/companion.svg',
      petAvatar: 'https://camp.test/companion.svg',
      rank: n + 1,
      damage: 125000 - n * 100,
      maxFloor: 30 - n,
      level: 9,
      petLevel: 9,
    }));
    await route.fulfill({ json: { code: 0, data: state.empty ? [] : records } });
  });
  page.once('close', state.release);
  return state;
}
