import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { dailyPointTaskIds } from '../../src/domain/sign-in';
import { assertArea } from './sign-in-layout';

for (const width of [1280, 375, 390]) {
  const mobile = width <= 760;
  test.describe(`${width}px`, () => {
    test.use({
      viewport: { width, height: mobile ? 812 : 720 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    for (const skin of builtinSkins)
      for (const colorMode of ['light', 'dark']) {
        test(`${skin.id} ${colorMode}: 今日可做和任务直达`, async ({ page }, info) => {
          await page.addInitScript(
            ({ skin, colorMode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', colorMode);
              sessionStorage.setItem(
                'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
                JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
              );
            },
            { skin: skin.id, colorMode },
          );
          await page.routeWebSocket(/\/ws\//, (socket) => socket.onMessage(() => {}));
          const api = (data: unknown) => ({ json: { code: 0, data } });
          await page.route('**/api/**', (route) => route.fulfill(api([])));
          await page.route('**/api/user/get/login', (route) =>
            route.fulfill(api({ id: 'task-user', userName: '任务岛友', userRole: 'user' })),
          );
          await page.route('**/api/pet/my/get', (route) =>
            route.fulfill(
              api({ petId: '17', userId: 'task-user', name: '伙伴', level: 1, equippedItems: {} }),
            ),
          );
          await page.route('**/api/tower/progress', (route) =>
            route.fulfill(api({ maxFloor: 0, maxOpenFloor: 80, completed: false, nextFloor: 1 })),
          );
          let signed = false;
          let completedTower = false;
          await page.route('**/api/sign/status', (route) =>
            route.fulfill(api({ todaySigned: signed })),
          );
          await page.route('**/api/sign/month?*', (route) => {
            const params = new URL(route.request().url()).searchParams;
            return route.fulfill(
              api({
                year: Number(params.get('year')),
                month: Number(params.get('month')),
                continuousDays: signed ? 1 : 0,
                totalSignInDays: signed ? 1 : 0,
                remainMakeUpCount: 3,
                currentPoints: signed ? 10 : 0,
                days: [],
              }),
            );
          });
          await page.route('**/api/user/signIn', (route) => {
            expect(route.request().method()).toBe('POST');
            signed = true;
            return route.fulfill(api({ totalPoints: 10, bonusPoints: 0, nextDayBonus: 0 }));
          });
          let reads = 0;
          let outcome: 'error' | 'empty' | 'ready' = 'error';
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route('**/api/sign/tasks', async (route) => {
            expect(route.request().headers()['synthetic-session']).toBe('synthetic');
            reads++;
            if (reads === 1) await gate;
            if (outcome === 'error')
              return route.fulfill({ json: { code: 50000, message: '任务暂不可用，请稍后重试' } });
            const now = Date.now();
            return route.fulfill(
              api({
                serverNow: String(now),
                refreshAt: String(now + 3600000),
                tasks:
                  outcome === 'empty'
                    ? []
                    : dailyPointTaskIds.map((id) => {
                        const quota =
                          id === 'sign_in' ||
                          id === 'speak' ||
                          id === 'moments_like' ||
                          id === 'pet_treasure';
                        const done = id === 'sign_in' ? signed : id === 'speak';
                        const state = done
                          ? 'done'
                          : quota || (id === 'tower_climb' && !completedTower)
                            ? 'ready'
                            : 'conditional';
                        const goal = id === 'sign_in' ? 1 : id === 'speak' ? 10 : 5;
                        return {
                          id,
                          state,
                          goal: quota ? goal : null,
                          progress: quota ? (done ? goal : id === 'moments_like' ? 2 : 0) : null,
                          earned: done
                            ? '10'
                            : id === 'moments_like'
                              ? '2'
                              : id === 'tower_climb' && completedTower
                                ? '15'
                                : '0',
                          detail: id === 'tower_climb' && completedTower ? '已通关开放楼层' : null,
                        };
                      }),
              }),
            );
          });
          const activate = (button: Locator) => (mobile ? button.tap() : button.click());
          await page.goto('/');
          const entry = page.locator('[data-sign-in-entry]:visible');
          await activate(entry);
          const dialog = page.getByRole('dialog', { name: '每日签到', exact: true });
          const tasksTab = dialog.getByRole('button', { name: '今日可做', exact: true });
          expect(reads).toBe(0);
          await activate(tasksTab);
          await expect(tasksTab).toHaveAttribute('aria-pressed', 'true');
          await expect(dialog.getByRole('status')).toContainText('正在读取今日积分任务');
          await expect(dialog.getByRole('button', { name: '刷新进度' })).toBeDisabled();
          release();
          await expect(dialog.getByRole('alert')).toContainText('任务暂不可用');
          outcome = 'empty';
          await activate(dialog.getByRole('button', { name: '重试', exact: true }));
          await expect(dialog.getByRole('status')).toContainText('今天暂无积分任务');
          outcome = 'ready';
          await activate(dialog.getByRole('button', { name: '刷新进度' }));
          const scroll = dialog.getByRole('region', { name: '今日积分任务' });
          await expect(scroll.getByRole('heading', { name: '待完成 · 4 项' })).toBeVisible();
          const progress = scroll.getByRole('progressbar', { name: '任务完成进度' });
          await expect(progress).toHaveAttribute('aria-valuetext', '已完成 1 / 5 项');
          await expect(scroll.getByText('今日任务积分', { exact: true })).toBeVisible();
          await expect(
            scroll.getByRole('listitem').filter({ hasText: '聊天室发言' }),
          ).toContainText('已完成');
          await assertArea(scroll, mobile);
          const sign = scroll.getByRole('button', { name: '前往每日签到' });
          await sign.focus();
          await expect(sign).toBeFocused();
          if (!mobile) await sign.hover();
          expect((await sign.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
          if (skin.id === 'wechat')
            await page.screenshot({ path: info.outputPath('today-tasks.png') });
          await activate(sign);
          await expect(dialog.getByRole('button', { name: '签到日历' })).toBeFocused();
          await activate(dialog.getByRole('button', { name: '立即签到' }));
          await expect(dialog.getByRole('button', { name: '今日已签到' })).toBeDisabled();
          await activate(tasksTab);
          await expect(scroll.getByRole('heading', { name: '待完成 · 3 项' })).toBeVisible();
          await expect(progress).toHaveAttribute('aria-valuetext', '已完成 2 / 5 项');
          await expect(scroll.getByRole('listitem').filter({ hasText: '每日签到' })).toContainText(
            '今日 +10 积分',
          );
          const tower = scroll.getByRole('button', { name: '前往宠物爬塔' });
          await expect(tower).toBeInViewport({ ratio: 1 });
          await activate(tower);
          await expect(page).toHaveURL('/pet?challenge=tower');
          await expect(
            page
              .getByRole('dialog', { name: '挑战', exact: true })
              .getByRole('heading', { name: '向第 1 层进发' }),
          ).toBeVisible({ timeout: 12000 });
          completedTower = true;
          await page.goBack();
          await activate(entry);
          await expect(scroll.getByRole('heading', { name: '待完成 · 2 项' })).toBeVisible();
          await expect(scroll.getByRole('listitem').filter({ hasText: '宠物爬塔' })).toContainText(
            '今日 +15 积分',
          );

          const track = scroll.locator('..').locator('[data-orientation="vertical"]');
          if (mobile) {
            await expect(track).toHaveCSS('visibility', 'hidden');
            const box = (await scroll.boundingBox())!;
            const cdp = await page.context().newCDPSession(page);
            const x = box.x + 26,
              y = box.y + box.height * 0.8;
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y }],
            });
            for (let i = 1; i <= 8; i++)
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: y - i * 24 }],
              });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
          } else {
            await scroll.hover();
            await expect(track).toHaveCSS('opacity', '1');
            await page.mouse.wheel(0, 360);
          }
          await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
          await assertArea(scroll, mobile);
          const last = scroll.getByRole('button', { name: '前往宠物 Boss' });
          await last.focus();
          await expect(last).toBeInViewport({ ratio: 1 });
          await assertArea(scroll, mobile);

          if (skin.id === 'wechat' && colorMode === 'light') {
            const before = reads;
            await page.evaluate(async () => {
              const modulePath = '/src/features/appearance/index.ts';
              const { useAppearanceStore } = (await import(
                modulePath
              )) as typeof import('../../src/features/appearance');
              useAppearanceStore.getState().setSkinId('pixel-island');
              useAppearanceStore.getState().setColorMode('dark');
            });
            await expect(page.locator('html')).toHaveAttribute('data-skin', 'pixel-island');
            await expect(tasksTab).toHaveAttribute('aria-pressed', 'true');
            expect(reads).toBe(before);
          }

          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(entry).toBeFocused();
          await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
        });
      }
  });
}
