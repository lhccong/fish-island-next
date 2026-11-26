import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { achievements } from './achievement-fixtures';

test.setTimeout(60_000);

for (const width of [1440, 375, 390]) {
  test.describe(`${width}px`, () => {
    const mobile = width <= 760;
    test.use({
      viewport: { width, height: 680 },
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: 'reduce',
    });

    for (const skin of builtinSkins) {
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode} · 成就状态和领取`, async ({ page }, info) => {
          await page.addInitScript(
            ({ skin, mode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', mode);
            },
            { skin: skin.id, mode },
          );
          await page.routeWebSocket(/\/ws\//, () => {});
          const user = {
            id: '123',
            userName: '成就测试',
            userRole: 'user',
            points: 5000,
            usedPoints: 0,
          };
          await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
          await page.route('**/api/user/**', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: {
                  ...user,
                  saTokenInfo: { tokenName: 'test-session', tokenValue: 'test-value' },
                },
              },
            }),
          );
          let catalogState: 'failure' | 'empty' | 'locked' | 'ready' = 'failure';
          let listRequests = 0;
          let claims = 0;
          let release!: () => void;
          let releaseClaim!: () => void;
          const loading = new Promise<void>((resolve) => {
            release = resolve;
          });
          const claiming = new Promise<void>((resolve) => {
            releaseClaim = resolve;
          });
          await page.route('**/api/user/achievements', async (route) => {
            listRequests++;
            if (catalogState === 'failure') {
              await loading;
              return route.fulfill({ status: 503 });
            }
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  awardedPoints: 0,
                  achievements:
                    catalogState === 'empty'
                      ? []
                      : achievements.map((item) =>
                          catalogState === 'locked' && item.id.endsWith('-sponsor')
                            ? {
                                ...item,
                                tracks: item.tracks.map((track) => ({
                                  ...track,
                                  level: 0,
                                  next: 1,
                                  claimablePoints: 0,
                                })),
                              }
                            : item,
                        ),
                },
              },
            });
          });
          await page.route('**/api/user/achievements/claim', async (route) => {
            expect(route.request().method()).toBe('POST');
            expect(route.request().postData()).toBeNull();
            if (++claims === 1) {
              await claiming;
              return route.fulfill({ status: 503 });
            }
            user.usedPoints = -6800;
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  awardedPoints: 6800,
                  achievements: achievements.map((item) => ({
                    ...item,
                    tracks: item.tracks.map((track) => ({
                      ...track,
                      claimedTiers: track.claimablePoints / item.points,
                      claimablePoints: 0,
                    })),
                  })),
                },
              },
            });
          });

          await page.goto('/user/login', { waitUntil: 'domcontentloaded' });
          await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('test-account');
          await page.getByLabel('密码', { exact: true }).fill('test-password');
          await page.getByRole('button', { name: '登录', exact: true }).click();
          await expect(page).not.toHaveURL(/\/user\/login/);
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
          await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
          if (mobile) await page.getByRole('link', { name: '发现', exact: true }).tap();
          else if (skin.id !== 'moyu-island')
            await page.getByRole('link', { name: '鱼小圈', exact: true }).click();
          const entry = page
            .getByRole('link', { name: '成就', exact: true })
            .filter({ visible: true });
          const openAchievements = () => (mobile ? entry.tap() : entry.click());
          await openAchievements();
          await expect(page.getByRole('status').filter({ hasText: '正在读取成就…' })).toBeVisible();
          release();
          await expect(page.getByRole('alert')).toContainText('成就服务暂不可用');
          catalogState = 'empty';
          const retry = page.getByRole('button', { name: '重试', exact: true });
          await (mobile ? retry.tap() : retry.click());
          await expect(page.getByText('暂无成就', { exact: true })).toBeVisible();
          catalogState = 'locked';
          await page.goBack();
          await openAchievements();
          const list = page.getByRole('region', { name: '成就列表' });
          const sponsor = list.locator('article').filter({ hasText: '海岛同行' });
          const majorSponsor = list.locator('article').filter({ hasText: '大金主' });
          await expect(sponsor).toContainText('单笔赞助满 1 · 奖励 1,000 积分');
          await expect(majorSponsor).toContainText('单笔赞助满 100 · 奖励 2,000 积分');
          for (const card of [sponsor, majorSponsor]) {
            await expect(card.getByRole('listitem')).toContainText('待达成');
            await expect(card.getByRole('listitem')).toContainText('暂无可领取奖励');
            await expect(card).not.toContainText(/人民币|元/);
          }
          await expect(page.getByText('可领取 3,800 积分', { exact: true })).toBeVisible();
          expect(claims).toBe(0);

          catalogState = 'ready';
          await page.goBack();
          await openAchievements();
          await expect(sponsor.getByRole('listitem')).toContainText('已达成');
          await expect(sponsor.getByRole('listitem')).toContainText('可领 1,000 积分');
          await expect(majorSponsor.getByRole('listitem')).toContainText('已达成');
          await expect(majorSponsor.getByRole('listitem')).toContainText('可领 2,000 积分');
          expect(claims).toBe(0);
          await expect(list.getByRole('heading', { name: '岛田丰章' })).toBeVisible();
          const userLevel = list.locator('article').filter({ hasText: '用户成长' });
          await expect(userLevel).toContainText('用户等级 · 每 1 级奖 200 积分');
          await expect(userLevel.getByRole('listitem')).toContainText('下一档 5 级');
          await expect(userLevel.getByRole('listitem')).toContainText('可领 600 积分');
          const turntable = list.locator('article').filter({ hasText: '转盘抽奖' });
          await expect(userLevel.getByRole('heading')).toBeInViewport();
          await expect(turntable.getByRole('heading')).toBeInViewport();
          await expect(turntable).toContainText('累计抽奖 · 每 100 次奖 500 积分');
          await expect(turntable.getByRole('listitem')).toContainText('210 次');
          await expect(turntable.getByRole('listitem')).toContainText('下一档 300 次');
          await expect(turntable.getByRole('listitem')).toContainText('可领 1,000 积分');
          const equipment = list.locator('article').filter({ hasText: '百炼铸星' });
          await expect(equipment.getByRole('listitem')).toHaveCount(6);
          await expect(equipment.getByRole('listitem').filter({ hasText: '项链' })).toContainText(
            '下一档 1 级',
          );
          await expect(equipment.getByRole('listitem').filter({ hasText: '翅膀' })).toContainText(
            '强化暂未开放',
          );
          await expect(list.locator('article svg')).toHaveCount(8);
          expect(
            await list
              .locator('article svg path')
              .evaluateAll((paths) => new Set(paths.map((path) => path.getAttribute('d'))).size),
          ).toBe(8);
          expect(
            await list
              .locator('article')
              .evaluateAll((cards) => cards.every((card) => card.scrollWidth <= card.clientWidth)),
          ).toBe(true);
          expect(await list.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true);
          expect(await list.evaluate((node) => getComputedStyle(node).paddingInlineEnd)).toBe(
            mobile ? '20px' : '24px',
          );
          await expect(page.getByText('可领取 6,800 积分', { exact: true })).toBeVisible();

          const scrollbar = list.locator('..').locator('[data-orientation="vertical"]');
          if (mobile) {
            await expect(scrollbar).toHaveCSS('visibility', 'hidden');
            const area = (await list.boundingBox())!;
            const touch = await page.context().newCDPSession(page);
            const x = area.x + area.width / 2;
            const y = area.y + area.height - 24;
            try {
              for (let swipe = 0; swipe < 3; swipe++) {
                await touch.send('Input.dispatchTouchEvent', {
                  type: 'touchStart',
                  touchPoints: [{ x, y }],
                });
                for (let step = 1; step <= 6; step++) {
                  await touch.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x, y: y - step * 65 }],
                  });
                }
                // End a deliberate drag without flinging the content into the next tap.
                await new Promise((resolve) => setTimeout(resolve, 150));
                await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
              }
              await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
            } finally {
              await touch.detach();
            }
            await expect(equipment.getByRole('listitem').last()).toBeInViewport();
          } else {
            await page.setViewportSize({ width, height: 460 });
            await list.focus();
            await expect(scrollbar).toBeVisible();
            await expect(scrollbar).toHaveCSS('opacity', '1');
            await list.press('End');
            await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
            await page.setViewportSize({ width, height: 680 });
          }

          const claim = page.getByRole('button', { name: '一键领取', exact: true });
          if (mobile) {
            expect((await claim.boundingBox())?.height).toBeGreaterThanOrEqual(44);
            await claim.tap();
          } else {
            expect((await claim.boundingBox())?.height).toBe(32);
            const normal = await claim.evaluate((node) => getComputedStyle(node).backgroundColor);
            await claim.hover();
            await expect
              .poll(() => claim.evaluate((node) => getComputedStyle(node).backgroundColor))
              .not.toBe(normal);
            await claim.focus();
            await expect(claim).toBeFocused();
            await claim.press('Enter');
          }
          await expect(page.getByRole('status').filter({ hasText: '领取中…' })).toBeVisible();
          await expect(claim).toBeDisabled();
          releaseClaim();
          await expect(page.getByRole('alert')).toContainText('成就服务暂不可用');
          await expect(page.getByText('可领取 6,800 积分', { exact: true })).toBeVisible();
          await (mobile ? claim.tap() : claim.click());
          await expect(
            page.getByRole('status').filter({ hasText: '已领取 6,800 积分' }),
          ).toBeVisible();
          await expect(userLevel.getByRole('listitem')).toContainText('已领 600 积分');
          await expect(turntable.getByRole('listitem')).toContainText('已领 1,000 积分');
          await expect(sponsor.getByRole('listitem')).toContainText('已领 1,000 积分');
          await expect(majorSponsor.getByRole('listitem')).toContainText('已领 2,000 积分');
          await expect(claim).toBeDisabled();
          expect(claims).toBe(2);
          if (
            skin.id === 'pixel-island' &&
            ((mode === 'dark' && width === 390) || (mode === 'light' && width === 1440))
          ) {
            await sponsor.scrollIntoViewIfNeeded();
            await majorSponsor.scrollIntoViewIfNeeded();
            await page.screenshot({ path: info.outputPath('achievements.png') });
          }
          if (skin.id === 'pixel-island' && mode === 'light' && width === 1440) {
            const requests = listRequests;
            await page.getByRole('button', { name: '切换主题' }).click();
            const appearance = page.getByRole('dialog', { name: '主题模式' });
            await appearance.getByRole('button', { name: '暗夜模式' }).click();
            await appearance.getByRole('button', { name: '摸鱼岛', exact: true }).click();
            await appearance.getByRole('button', { name: '关闭主题弹窗' }).click();
            await expect(page.locator('html')).toHaveAttribute('data-skin', 'moyu-island');
            await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
            await expect(
              page.getByRole('status').filter({ hasText: '已领取 6,800 积分' }),
            ).toBeVisible();
            expect(listRequests).toBe(requests);
          }
        });
      }
    }
  });
}
