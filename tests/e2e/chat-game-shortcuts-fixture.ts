import type { Page } from '@playwright/test';
import { makeLands } from './farm-fixture';

export async function shortcutFixture(page: Page) {
  const state = {
    farm: 'ready',
    pet: 'ready',
    farmRequests: 0,
    petRequests: 0,
    careRequests: 0,
  };
  const pet = {
    petId: '17',
    name: '合成伙伴',
    level: 8,
    exp: 135,
    hunger: 60,
    mood: 75,
    equipStats: { totalBaseHp: 120, totalBaseAttack: 20 },
    equippedItems: {},
  };
  await page.route('**/api/land/my', async (route) => {
    state.farmRequests++;
    const deadline = Date.now() + 10000;
    while (state.farm === 'loading' && !page.isClosed() && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 50));
    await route.fulfill({
      status: state.farm === 'error' ? 503 : 200,
      json: { code: 0, data: state.farm === 'empty' ? [] : makeLands() },
    });
  });
  await page.route('**/api/crop/all', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/farm/user/info', (route) =>
    route.fulfill({
      json: { code: 0, data: { userName: '合成岛友', level: 5, experience: 120 } },
    }),
  );
  await page.route('**/api/pet/my/get', async (route) => {
    state.petRequests++;
    const deadline = Date.now() + 10000;
    while (state.pet === 'loading' && !page.isClosed() && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 50));
    await route.fulfill({
      status: state.pet === 'error' ? 503 : 200,
      json: { code: 0, data: state.pet === 'empty' ? null : pet },
    });
  });
  await page.route('**/api/pet/feed?*', (route) => {
    state.careRequests++;
    pet.hunger = 90;
    return route.fulfill({ json: { code: 0, data: pet } });
  });
  await page.route('**/api/itemInstances/my/list/page/vo', (route) =>
    route.fulfill({ json: { code: 0, data: { records: [], total: 0 } } }),
  );
  await page.route('**/api/pet/treasure/status', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          serverNow: Date.now(),
          resetAt: Date.now() + 86400000,
          nextAvailableAt: 0,
          used: 0,
          active: null,
          lastReward: null,
        },
      },
    }),
  );
  return state;
}
