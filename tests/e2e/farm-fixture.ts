import type { Page } from '@playwright/test';
import { setup } from './fish-circle-fixture';
export function makeLands() {
  return Array.from({ length: 24 }, (_, i) => ({
    id: String(i + 1),
    landIndex: i + 1,
    locked: i >= 8 ? 1 : 0,
    status: i === 0 ? 2 : i < 4 ? 1 : 0,
    cropName: i < 4 ? '小萝卜' : '',
    plantedCropId: i < 4 ? '1' : null,
    plantedTime: new Date(Date.now() - 3600000).toISOString(),
    harvestTime: new Date(Date.now() + (i === 0 ? -1000 : 3600000)).toISOString(),
    lastWateredTime: null as string | null,
    dailyWaterCount: 0,
    unlockCost: i === 8 ? 100 : null,
    unlockLevel: i === 8 ? 2 : null,
    canSteal: i === 0,
  }));
}
export async function farmFixture(page: Page) {
  await setup(page);
  const state = {
    lands: makeLands(),
    status: 'ready',
    failAction: false,
    failRefresh: false,
    calls: 0,
    actions: [] as { path: string; body: Record<string, unknown> }[],
    read: false,
  };
  await page.route('**/api/user/get/login', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: { id: '123', userName: '合成岛友', userRole: 'admin', points: 10000, usedPoints: 0 },
      },
    }),
  );
  await page.route('**/api/crop/all', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: Array.from({ length: 22 }, (_, i) => ({
          id: String(i + 1),
          name: i === 0 ? '小萝卜' : `作物${i + 1}`,
          category: 'vegetable',
          price: 5,
          coin: 10,
          experience: 3,
          growthTime: 30,
          unlockLevel: i === 21 ? 99 : 1,
          locked: i === 21,
        })),
      },
    }),
  );
  await page.route('**/api/farm/user/info', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: { userName: '合成岛友', level: 5, experience: 120, totalHarvest: 12 },
      },
    }),
  );
  await page.route('**/api/farm/friend/list', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data:
          state.status === 'socialEmpty'
            ? []
            : [{ friendId: '456', nickname: '合成好友', level: 3, canSteal: true }],
      },
    }),
  );
  await page.route('**/api/farm/friend/lands?**', (r) =>
    r.fulfill({ json: { code: 0, data: makeLands() } }),
  );
  await page.route('**/api/steal/my-stolen', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data:
          state.status === 'socialEmpty'
            ? []
            : [
                {
                  id: '1',
                  stealerNickname: '合成好友',
                  cropName: '萝卜',
                  coinGained: 2,
                  stolenTime: '2026-11-14 08:00',
                  isRead: state.read ? 1 : 0,
                },
              ],
      },
    }),
  );
  await page.route('**/api/steal/my-stolen/read-all', (r) => {
    state.read = true;
    return r.fulfill({ json: { code: 0, data: true } });
  });
  await page.route('**/api/land/**', async (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path.endsWith('/my')) {
      state.calls++;
      while (state.status === 'loading' && !page.isClosed())
        await new Promise((resolve) => setTimeout(resolve, 350));
      return r.fulfill({
        status: state.status === 'error' || state.failRefresh ? 503 : 200,
        json: { code: 0, data: state.status === 'empty' ? [] : state.lands },
      });
    }
    const body = r.request().postDataJSON();
    state.actions.push({ path, body });
    if (state.failAction)
      return r.fulfill({ json: { code: 40000, message: '积分不足，请补充积分后重试' } });
    const items = body.items as { landId: string }[] | undefined;
    const ids = items?.map((v) => v.landId) ?? body.landIds ?? [body.landId];
    state.lands = state.lands.map((l) => {
      if (!ids.includes(l.id)) return l;
      if (path.endsWith('/plant'))
        return { ...l, status: 1, cropName: '小萝卜', plantedCropId: '1' };
      if (path.endsWith('/harvest')) return { ...l, status: 0, cropName: '', plantedCropId: null };
      if (path.endsWith('/unlock')) return { ...l, locked: 0 };
      return { ...l, dailyWaterCount: 1, lastWateredTime: new Date().toISOString() };
    });
    return r.fulfill({
      json: {
        code: 0,
        data: path.endsWith('/batch')
          ? ids.map((landId: string) => ({ landId, success: true }))
          : state.lands,
      },
    });
  });
  await page.route('**/api/steal', (r) => {
    state.actions.push({ path: '/api/steal', body: r.request().postDataJSON() });
    return r.fulfill({ json: { code: 0, data: [{ coinGained: 2 }] } });
  });
  return state;
}
