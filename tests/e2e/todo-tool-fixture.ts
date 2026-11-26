import type { Page } from '@playwright/test';

export const today = '2026-11-26';
export const prior = '2026-11-01';
export const oldTask = {
  id: 1,
  title: '旧版待办',
  date: prior,
  description: '旧版描述',
  note: '旧版备注',
  bgColor: '#123abc',
  priority: 'low',
  status: 'pending',
  extension: '旧字段',
};
export const weekly = { id: 1, title: '旧版周报', type: 'weekly', startDate: prior };

export async function mockAccount(page: Page, skin: string, mode: string) {
  await page.clock.setFixedTime(new Date(2026, 10, 26, 12));
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      for (const base of ['https://api.yucoder.cn', location.origin]) {
        sessionStorage.setItem(
          `fish-island-next.session:${encodeURIComponent(base)}`,
          JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
        );
      }
    },
    { skin, mode },
  );
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/get/login', (route) =>
    route.fulfill({
      json: { code: 0, data: { id: 'synthetic-account', userName: '测试岛友', userRole: 'user' } },
    }),
  );
  await page.routeWebSocket(/\/ws\//, () => {});
}
