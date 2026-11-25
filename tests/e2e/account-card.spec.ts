import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { capture, close, layout, open, scrollRegion } from './account-menu-layout';

const account = '90071992547409920';
const fan = '90071992547409921';
const coverUrl = 'https://images.example.test/profile-cover.svg';

for (const width of [1280, 375, 390]) {
  const mobile = width < 760;
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, isMobile: mobile, hasTouch: mobile });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 卡片统计与关注关系`, async ({ page }) => {
          function press(button: Locator) {
            return mobile ? button.tap() : button.click();
          }

          let following = false;
          let accountReads = 0;
          let failCard = false;
          let releaseCard!: () => void;
          const cardPending = new Promise<void>((resolve) => {
            releaseCard = resolve;
          });
          const fanPages: string[] = [];
          let failFirstPage = true;
          let failAppend = true;
          let failToggle = true;
          let releaseToggle!: () => void;
          const togglePending = new Promise<void>((resolve) => {
            releaseToggle = resolve;
          });
          const fanRecord = () => ({ userId: fan, userName: '合成粉丝', isMutual: following });
          await page.addInitScript(
            ({ skinId, colorMode }) => {
              localStorage.setItem('fish-island:skin', skinId);
              localStorage.setItem('fish-island:color-mode', colorMode);
              sessionStorage.setItem(
                'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
                JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
              );
            },
            { skinId: skin.id, colorMode: mode },
          );
          await page.routeWebSocket(/\/ws\//, (socket) => socket.onMessage(() => {}));
          await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
          await page.route(coverUrl, (route) =>
            route.fulfill({
              contentType: 'image/svg+xml',
              body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#647e9d"/><circle cx="160" cy="76" r="48" fill="#e5be81"/></svg>',
            }),
          );
          await page.route('**/api/user/get/login', async (route) => {
            accountReads++;
            if (failCard) {
              await cardPending;
              return route.fulfill({ json: { code: 50000, message: '卡片读取失败' } });
            }
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  id: account,
                  userName: '合成岛友',
                  userProfile: '这是一条用于验证卡片正文滚动的简介。'.repeat(36),
                  momentsBgUrl: coverUrl,
                  level: 6,
                  points: 271,
                  followingCount: following ? '1' : '0',
                  followerCount: '12',
                },
              },
            });
          });
          await page.route('**/api/follow/followers?*', (route) => {
            const params = new URL(route.request().url()).searchParams;
            const current = params.get('current') ?? '';
            fanPages.push(current);
            expect(params.get('pageSize')).toBe('20');
            if (current === '1' && failFirstPage)
              return route.fulfill({ json: { code: 50000, message: '名单读取失败' } });
            if (current === '2' && failAppend)
              return route.fulfill({ json: { code: 50000, message: '续载失败' } });
            const records =
              current === '1'
                ? [
                    fanRecord(),
                    ...Array.from({ length: 10 }, (_, index) => ({
                      userId: String(index + 2),
                      userName: `合成粉丝 ${index + 1}`,
                      userProfile: index === 0 ? '长昵称与简介'.repeat(12) : '合成简介',
                      isMutual: false,
                    })),
                  ]
                : [fanRecord(), { userId: '12', userName: '末页粉丝', isMutual: false }];
            return route.fulfill({ json: { code: 0, data: { total: '12', records } } });
          });
          await page.route('**/api/follow/following?*', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: { total: following ? '1' : '0', records: following ? [fanRecord()] : [] },
              },
            }),
          );
          await page.route('**/api/follow/toggle?*', async (route) => {
            expect(new URL(route.request().url()).searchParams.get('followUserId')).toBe(fan);
            if (failToggle) {
              await togglePending;
              return route.fulfill({ json: { code: 50000, message: '回关失败' } });
            }
            following = !following;
            return route.fulfill({ json: { code: 0, data: following } });
          });

          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await expect(page.getByRole('button', { name: '用户菜单', exact: true })).toBeVisible();
          failCard = true;
          const dialog = await open(page, '我的卡片');
          await expect(
            dialog.getByRole('status').filter({ hasText: '正在读取卡片' }),
          ).toBeVisible();
          await layout(page, mobile);
          releaseCard();
          await expect(dialog.getByRole('alert')).toHaveText('卡片读取失败');
          await expect(dialog.getByRole('button', { name: '粉丝人数未知' })).toBeEnabled();
          failCard = false;
          await press(dialog.getByRole('button', { name: '重试', exact: true }));
          const fans = dialog.getByRole('button', { name: '粉丝 12', exact: true });
          await expect(fans).toBeVisible();
          await expect(dialog.locator('dd')).toHaveText(['6', '271']);
          const profile = dialog.getByRole('region', { name: '我的卡片内容' });
          await profile.evaluate((el) => {
            el.scrollTop = 0;
          });
          const cover = dialog.getByRole('img', { name: '合成岛友的封面' });
          await expect(cover).toHaveCSS('object-fit', 'cover');
          await expect(dialog.getByText('正在加载封面…')).toHaveCount(0);
          const dialogBox = (await dialog.boundingBox())!;
          const profileBox = (await profile.boundingBox())!;
          const coverBox = (await cover.boundingBox())!;
          const panelBox = (await profile.locator('article').boundingBox())!;
          const reveal = mobile ? 208 : 240;
          expect(dialogBox.width).toBe(mobile ? width - 16 : 520);
          expect(coverBox).toEqual(profileBox);
          expect(panelBox.y - profileBox.y).toBeCloseTo(reveal, 0);
          expect(
            profileBox.x + profileBox.width - panelBox.x - panelBox.width,
          ).toBeGreaterThanOrEqual(mobile ? 20 : 24);
          const cardTrack = profile.locator('+ [data-orientation="vertical"]');
          if (mobile) await expect(cardTrack).toHaveCSS('visibility', 'hidden');
          else {
            await profile.hover();
            await expect(cardTrack).toHaveCSS('opacity', '1');
          }
          await layout(page, mobile);

          await press(fans);
          await expect(dialog.getByRole('heading', { name: '我的粉丝' })).toBeFocused();
          await expect(dialog.getByRole('alert')).toHaveText('名单读取失败');
          failFirstPage = false;
          await press(dialog.getByRole('button', { name: '重试', exact: true }));
          const region = dialog.getByRole('region', { name: '粉丝列表' });
          const fanRow = region.getByRole('listitem').filter({
            has: page.getByText('合成粉丝', { exact: true }),
          });
          const action = fanRow.getByRole('button', { name: '回关', exact: true });
          const unfollow = fanRow.getByRole('button', { name: '取消关注', exact: true });
          const badge = fanRow.getByText('互相关注', { exact: true });
          await expect(action).toBeVisible();
          await expect(badge).toHaveCount(0);
          const actionBox = (await action.boundingBox())!;
          expect(actionBox.height).toBe(mobile ? 44 : 32);
          const track = region.locator('..').locator('[data-orientation="vertical"]');
          if (mobile) await expect(track).toBeHidden();
          else {
            await action.hover();
            await expect(track).toHaveCSS('opacity', '1');
            const rail = (await track.boundingBox())!;
            expect(rail.x - actionBox.x - actionBox.width).toBeGreaterThanOrEqual(16);
          }
          await capture(page, '粉丝名单');
          await press(action);
          await expect(action).toBeDisabled();
          await expect(dialog.getByRole('status').filter({ hasText: '正在处理' })).toBeVisible();
          releaseToggle();
          await expect(dialog.getByRole('alert')).toHaveText('回关失败');
          await expect(action).toBeEnabled();
          await expect(badge).toHaveCount(0);
          failToggle = false;
          await press(action);
          await expect(unfollow).toBeEnabled();
          await expect(badge).toBeInViewport({ ratio: 1 });
          await capture(page, '互相关注');
          await press(unfollow);
          await expect(action).toBeEnabled();
          await expect(badge).toHaveCount(0);
          await press(action);
          await expect(badge).toBeVisible();

          for (let swipe = 0; swipe < 6 && !fanPages.includes('2'); swipe++) {
            await scrollRegion(page, region, mobile);
          }
          await expect(
            region.getByRole('alert').getByText('续载失败', { exact: true }),
          ).toBeVisible();
          await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
          await expect(region.getByRole('listitem')).toHaveCount(11);
          const appendedPages = () => fanPages.filter((number) => number !== '1');
          expect(appendedPages()).toEqual(['2']);
          failAppend = false;
          const retry = region.getByRole('button', { name: '重试粉丝列表' });
          await retry.evaluate((button) => button.scrollIntoView({ block: 'center' }));
          await expect(retry).toBeInViewport({ ratio: 1 });
          await press(retry);
          await expect(region.getByRole('listitem')).toHaveCount(12);
          await expect(region.getByText('已全部加载')).toBeVisible();
          await layout(page, mobile);
          const lastAction = region.getByRole('listitem').last().getByRole('button');
          await lastAction.focus();
          await expect(lastAction).toBeFocused();
          await expect(lastAction).toBeInViewport({ ratio: 1 });
          const readsBeforeAppearance = accountReads;
          const pagesBeforeAppearance = [...fanPages];
          await page.evaluate(
            async ({ nextSkin, nextMode }) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              useAppearanceStore.getState().setSkinId(nextSkin as never);
              useAppearanceStore.getState().setColorMode(nextMode as never);
            },
            {
              nextSkin: skin.id === 'wechat' ? 'wecom' : 'wechat',
              nextMode: mode === 'light' ? 'dark' : 'light',
            },
          );
          await expect(region.getByRole('listitem').last()).toContainText('末页粉丝');
          await expect(badge).toBeVisible();
          expect(accountReads).toBe(readsBeforeAppearance);
          expect(appendedPages()).toEqual(['2', '2']);
          expect(fanPages).toEqual(pagesBeforeAppearance);
          await page.evaluate(
            async ({ skinId, colorMode }) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              useAppearanceStore.getState().setSkinId(skinId as never);
              useAppearanceStore.getState().setColorMode(colorMode as never);
            },
            { skinId: skin.id, colorMode: mode },
          );

          const back = dialog.getByRole('button', { name: '返回卡片' });
          await press(back);
          await expect(fans).toBeFocused();
          await press(dialog.getByRole('button', { name: '关注 1', exact: true }));
          const followingRegion = dialog.getByRole('region', { name: '关注列表' });
          await expect(followingRegion.getByText('合成粉丝', { exact: true })).toBeVisible();
          await expect(followingRegion.getByText('互相关注', { exact: true })).toBeVisible();
          await press(dialog.getByRole('button', { name: '取消关注', exact: true }));
          await expect(dialog.getByText('暂无关注。', { exact: true })).toBeVisible();
          await layout(page, mobile);
          await press(back);
          await expect(dialog.getByRole('button', { name: '关注 0', exact: true })).toBeFocused();
          await expect(fans).toBeVisible();
          if (mobile) {
            await dialog.getByRole('button', { name: '关闭我的卡片' }).tap();
            await expect(dialog).toHaveCount(0);
            await expect(page.getByRole('button', { name: '用户菜单', exact: true })).toBeFocused();
          } else {
            await close(page);
          }
        });
      }
  });
}
