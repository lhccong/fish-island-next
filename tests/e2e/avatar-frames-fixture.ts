import { expect, type Page } from '@playwright/test';

const pendingFixtures = new WeakMap<Page, () => void>();
export function releaseFrameFixture(page: Page) {
  pendingFixtures.get(page)?.();
}

export async function frameFixture(page: Page, skin: string, mode: string) {
  const user = {
    id: 'synthetic-frame-user',
    userName: '头像框岛友',
    userRole: 'user',
    userAvatar: '',
    avatarFramerUrl: '',
    points: 1000,
    usedPoints: 100,
  };
  const state = {
    catalog: 'loading',
    moreFail: true,
    exchangeFail: true,
    wearFail: true,
    reads: 0,
    exchanges: 0,
    sets: 0,
    sockets: 0,
    owned: false,
    release: () => {},
  };
  const gate = new Promise<void>((resolve) => {
    state.release = resolve;
  });
  pendingFixtures.set(page, state.release);
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      sessionStorage.setItem(
        'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
        JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic-value' }),
      );
    },
    { skin, mode },
  );
  await page.routeWebSocket(/\/ws\//, (socket) => {
    state.sockets++;
    socket.onMessage(() => {});
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/get/login', (route) =>
    route.fulfill({ json: { code: 0, data: user } }),
  );
  await page.route('**/api/chat/message/page/vo', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          records: [
            {
              messageWrapper: {
                message: {
                  id: 'frame-message',
                  content: '头像框历史消息',
                  timestamp: 1794700000000,
                  sender: {
                    id: 'synthetic-other',
                    name: '另一岛友',
                    avatarFramerUrl: 'https://frame.test/1.svg',
                  },
                },
              },
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/chat/online/user', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: [
          { id: 'synthetic-other', name: '另一岛友', avatarFramerUrl: 'https://frame.test/1.svg' },
        ],
      },
    }),
  );
  await page.route('https://frame.test/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="37" fill="none" stroke="teal" stroke-width="5"/></svg>',
    }),
  );
  const frame = (i: number) => ({
    id: String(i),
    name: `海风头像框 ${i}`,
    url: `https://frame.test/${i}.svg`,
    points: i === 3 ? 9999 : 100,
    hasOwned: i === 1 ? state.owned : i !== 3,
  });
  await page.route('**/api/api/avatar/frame/list/page/vo', async (route) => {
    state.reads++;
    expect(route.request().headers()['synthetic-session']).toBe('synthetic-value');
    if (state.catalog === 'loading') await gate;
    if (state.catalog === 'error')
      return route.fulfill({ json: { code: 50000, message: '头像框暂不可用' } });
    const current = (route.request().postDataJSON() as { current: number }).current;
    if (current > 1 && state.moreFail)
      return route.fulfill({ json: { code: 50000, message: '追加失败，请重试' } });
    await route.fulfill({
      json: {
        code: 0,
        data: {
          total: state.catalog === 'empty' ? '0' : '13',
          records:
            state.catalog === 'empty'
              ? []
              : current === 1
                ? Array.from({ length: 12 }, (_, i) => frame(i + 1))
                : [frame(12), frame(13)],
        },
      },
    });
  });
  await page.route('**/api/api/avatar/frame/exchange?*', (route) => {
    state.exchanges++;
    expect(route.request().method()).toBe('POST');
    expect(new URL(route.request().url()).searchParams.get('frameId')).toBe('1');
    if (state.exchangeFail)
      return route.fulfill({ json: { code: 50000, message: '兑换暂时失败' } });
    state.owned = true;
    user.usedPoints += 100;
    return route.fulfill({ json: { code: 0, data: true } });
  });
  await page.route('**/api/api/avatar/frame/set?*', (route) => {
    state.sets++;
    if (state.wearFail) return route.fulfill({ json: { code: 50000, message: '穿戴暂时失败' } });
    const id = new URL(route.request().url()).searchParams.get('frameId');
    user.avatarFramerUrl = id === '-1' ? '' : `https://frame.test/${id}.svg`;
    return route.fulfill({ json: { code: 0, data: true } });
  });
  return state;
}
