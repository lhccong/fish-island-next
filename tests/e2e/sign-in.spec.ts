import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { assertArea } from './sign-in-layout';

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}px`, () => {
    test.use({
      viewport,
      isMobile: viewport.width <= 760,
      hasTouch: viewport.width <= 760,
      deviceScaleFactor: 1,
    });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 签到日历、补签与恢复`, async ({ page }, info) => {
          await page.clock.setFixedTime(new Date('2026-11-14T04:00:00Z'));
          await page.addInitScript(
            ({ skin, mode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', mode);
              sessionStorage.setItem(
                'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
                JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
              );
            },
            { skin: skin.id, mode },
          );
          const sockets: WebSocketRoute[] = [];
          await page.routeWebSocket(/\/ws\//, (socket) => {
            sockets.push(socket);
            socket.onMessage(() => {});
          });
          await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
          await page.route('**/api/user/get/login', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: { id: 'synthetic-sign-user', userName: '签到测试岛友', userRole: 'user' },
              },
            }),
          );
          let signed = false,
            madeUp = false,
            signPosts = 0,
            makePosts = 0,
            reads = 0;
          let calendarState: 'loading' | 'error' | 'empty' | 'ready' = 'loading';
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route('**/api/sign/status', (route) =>
            route.fulfill({ json: { code: 0, data: { todaySigned: signed } } }),
          );
          await page.route('**/api/sign/month?*', async (route) => {
            reads++;
            if (calendarState === 'loading') await gate;
            if (calendarState === 'error')
              return route.fulfill({ json: { code: 50000, message: '签到记录暂不可用' } });
            const url = new URL(route.request().url());
            const year = Number(url.searchParams.get('year')),
              month = Number(url.searchParams.get('month'));
            await route.fulfill({
              json: {
                code: 0,
                data: {
                  year,
                  month,
                  continuousDays: signed ? 4 : 3,
                  totalSignInDays: 15,
                  currentPoints: madeUp ? 100 : signed ? 110 : 100,
                  remainMakeUpCount: madeUp ? 2 : 3,
                  days:
                    calendarState === 'empty'
                      ? []
                      : Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => ({
                          day: i + 1,
                          date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
                          rewardPoints: 10,
                          signed:
                            month === 11 && ((i + 1 === 14 && signed) || (i + 1 === 13 && madeUp)),
                          isToday: month === 11 && i + 1 === 14,
                          canMakeUp: month === 11 && i + 1 === 13 && !madeUp,
                          signType:
                            month === 11 && i + 1 === 13 && madeUp
                              ? 2
                              : month === 11 && i + 1 === 14 && signed
                                ? 1
                                : null,
                        })),
                },
              },
            });
          });
          await page.route('**/api/user/signIn', async (route) => {
            signPosts++;
            expect(route.request().method()).toBe('POST');
            if (signPosts === 1)
              return route.fulfill({ json: { code: 50000, message: '签到失败，请重试' } });
            signed = true;
            await route.fulfill({
              json: { code: 0, data: { totalPoints: 10, bonusPoints: 0, nextDayBonus: 5 } },
            });
          });
          await page.route('**/api/sign/makeup', async (route) => {
            makePosts++;
            expect(route.request().postDataJSON()).toEqual({ signDate: '2026-11-13' });
            if (makePosts === 1)
              return route.fulfill({ json: { code: 50000, message: '补签暂时失败' } });
            madeUp = true;
            await route.fulfill({
              json: { code: 0, data: { totalPoints: 10, bonusPoints: 0, nextDayBonus: 0 } },
            });
          });
          await page.goto('/');
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await page.getByRole('button', { name: '每日签到', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: '每日签到', exact: true });
          const scroll = dialog.getByRole('region', { name: '签到详情' });
          await expect(dialog.getByText('正在读取签到记录…')).toBeVisible();
          calendarState = 'error';
          release();
          await expect(dialog.getByRole('alert')).toContainText('签到记录暂不可用');
          calendarState = 'empty';
          await dialog.getByRole('button', { name: '重新读取' }).click();
          await expect(dialog.getByText('本月暂无签到日历，请稍后重新读取。')).toBeVisible();
          calendarState = 'ready';
          await dialog.getByRole('button', { name: '重新读取' }).click();
          await expect(dialog.getByLabel('月度签到日历')).toBeVisible();
          const mobile = page.viewportSize()!.width <= 760;
          await assertArea(scroll, mobile);
          if (mobile) {
            const rect = await dialog.getByRole('button', { name: /11月13日/ }).boundingBox();
            expect(rect!.width).toBeGreaterThanOrEqual(44);
            expect(rect!.height).toBeGreaterThanOrEqual(44);
          }
          await page.screenshot({ path: info.outputPath(`sign-in-top-${skin.id}-${mode}.png`) });
          await dialog.getByRole('button', { name: '立即签到' }).click();
          await expect(dialog.getByRole('alert')).toContainText('签到失败，请重试');
          await dialog.getByRole('button', { name: '立即签到' }).click();
          await expect(dialog.getByRole('button', { name: '今日已签到' })).toBeDisabled();
          await expect(
            dialog.getByRole('status').filter({ hasText: '获得 10 积分' }),
          ).toBeVisible();
          expect(signPosts).toBe(2);
          const dateButton = dialog.getByRole('button', { name: /11月13日/ });
          await dateButton.scrollIntoViewIfNeeded();
          if (mobile) await dateButton.tap();
          else await dateButton.click();
          const confirm = page.getByRole('dialog', { name: '确认补签', exact: true });
          await expect(confirm).toContainText('20 积分');
          await confirm.getByRole('button', { name: '取消补签' }).click();
          expect(makePosts).toBe(0);
          await dateButton.click();
          await confirm.getByRole('button', { name: '确认补签', exact: true }).click();
          await expect(confirm.getByRole('alert')).toContainText('补签暂时失败');
          await confirm.getByRole('button', { name: '确认补签', exact: true }).click();
          await expect(confirm).toHaveCount(0);
          await expect(
            dialog.getByRole('status').filter({ hasText: '已消耗 20 积分' }),
          ).toBeVisible();
          await dialog.getByRole('button', { name: '上个月' }).click();
          await expect(dialog.getByRole('heading', { name: '2026年 10月' })).toBeVisible();
          await expect(dialog.getByLabel('月度签到日历')).toBeVisible();
          if (skin.id === 'wechat' && mode === 'light') {
            const beforeSwitch = reads;
            for (const theme of builtinSkins)
              for (const colorMode of ['light', 'dark'] as const) {
                await page.evaluate(
                  async ({ id, colorMode }) => {
                    const modulePath = '/src/features/appearance/index.ts';
                    const feature = (await import(
                      modulePath
                    )) as typeof import('../../src/features/appearance');
                    feature.useAppearanceStore.getState().setSkinId(id);
                    feature.useAppearanceStore.getState().setColorMode(colorMode);
                  },
                  { id: theme.id, colorMode },
                );
                await expect(page.locator('html')).toHaveAttribute('data-skin', theme.id);
                await expect(page.locator('html')).toHaveAttribute('data-color-mode', colorMode);
                await expect(dialog.getByRole('heading', { name: '2026年 10月' })).toBeVisible();
                await expect(dialog.getByRole('button', { name: '今日已签到' })).toBeDisabled();
                expect(reads).toBe(beforeSwitch);
              }
            await page.evaluate(async () => {
              const modulePath = '/src/features/appearance/index.ts';
              const feature = (await import(
                modulePath
              )) as typeof import('../../src/features/appearance');
              feature.useAppearanceStore.getState().setSkinId('wechat');
              feature.useAppearanceStore.getState().setColorMode('light');
            });
          }
          await dialog.getByRole('button', { name: '回到本月' }).click();
          await expect(dialog.getByRole('heading', { name: '2026年 11月' })).toBeVisible();
          await expect(dialog.getByLabel('月度签到日历')).toBeVisible();
          await scroll.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
          });
          await assertArea(scroll, mobile);
          const layout = await dialog.evaluate((element) => ({
            overflow: element.scrollWidth > element.clientWidth,
            right: element.getBoundingClientRect().right,
            width: window.innerWidth,
          }));
          expect(layout.overflow).toBe(false);
          expect(layout.right).toBeLessThanOrEqual(layout.width);
          await page.screenshot({ path: info.outputPath(`sign-in-${skin.id}-${mode}.png`) });
          const before = reads;
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(page.getByRole('button', { name: '每日签到', exact: true })).toBeFocused();
          expect(reads).toBe(before);
          sockets.forEach((socket) => socket.close());
        });
      }
  });
}
